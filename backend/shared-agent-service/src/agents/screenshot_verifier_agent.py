import json
import re

from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from src.config import Settings
from src.models.schemas import (
    ActualEarningData,
    AgentVerificationOutput,
    ReceiptExtraction,
    ReceiptExtractionDraft
)
from src.prompts.screenshot_verifier_prompt import (
    REACT_AGENT_PROMPT,
    VISION_RECEIPT_PROMPT
)
from src.tools.interfaces import EarningsServiceAdapter
from src.tools.langchain_tools import build_verifier_tools


class VisionReceiptAnalyzer:
    def __init__(self, api_key: str, model_name: str):
        self._vision_llm = ChatGroq(
            api_key=api_key,
            model=model_name,
            temperature=0
        )
        self._structured_llm = self._vision_llm.with_structured_output(ReceiptExtractionDraft)

    def analyze(self, image_url: str) -> ReceiptExtraction:
        response = self._structured_llm.invoke(
            [
                HumanMessage(
                    content=[
                        {'type': 'text', 'text': VISION_RECEIPT_PROMPT},
                        {'type': 'image_url', 'image_url': {'url': image_url}}
                    ]
                )
            ]
        )

        gross_amount = round(max(float(response.gross_amount), 0.0), 2)
        platform_deduction = round(max(float(response.platform_deduction or 0.0), 0.0), 2)
        net_amount = round(max(gross_amount - platform_deduction, 0.0), 2)

        platform_name = (response.platform_name or 'unknown').strip() or 'unknown'

        return ReceiptExtraction(
            platform_name=platform_name,
            gross_amount=gross_amount,
            platform_deduction=platform_deduction,
            net_amount=net_amount,
            deduction_label=response.deduction_label
        )


class AIScreenshotVerifierAgent:
    def __init__(self, settings: Settings, earnings_adapter: EarningsServiceAdapter):
        if not settings.groq_api_key:
            raise ValueError('Missing GROQ API key. Set GROQ_API or GROQ_API_KEY in .env')

        self._settings = settings
        self._earnings_adapter = earnings_adapter
        self._vision_analyzer = VisionReceiptAnalyzer(
            api_key=settings.groq_api_key,
            model_name=settings.groq_vision_model
        )

        tools = build_verifier_tools(
            adapter=self._earnings_adapter,
            analyze_receipt_image_fn=self._vision_analyzer.analyze
        )

        react_prompt = PromptTemplate.from_template(REACT_AGENT_PROMPT)
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_agent_model,
            temperature=0
        )

        agent = create_react_agent(llm=llm, tools=tools, prompt=react_prompt)
        self._executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=False,
            handle_parsing_errors=True,
            max_iterations=6
        )

    def evaluate(self, worker_id: str, session_id: str) -> AgentVerificationOutput:
        agent_input = json.dumps({'worker_id': worker_id, 'session_id': session_id})

        try:
            result = self._executor.invoke({'input': agent_input})
            output_text = result.get('output', '')
            payload = self._extract_json_payload(output_text)
            return self._coerce_agent_payload(payload)
        except Exception:
            return self._fallback_evaluation(worker_id, session_id)

    def _extract_json_payload(self, output_text: str) -> dict:
        candidate = (output_text or '').strip()
        if not candidate:
            raise ValueError('Agent did not return output')

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        match = re.search(r'\{.*\}', candidate, re.DOTALL)
        if not match:
            raise ValueError('Could not parse agent JSON output')

        return json.loads(match.group(0))

    def _coerce_agent_payload(self, payload: dict) -> AgentVerificationOutput:
        image_url = str(payload.get('image_url', '')).strip()
        if not image_url:
            raise ValueError('Agent output does not contain image_url')

        extracted_payload = payload.get('extracted_data')
        if extracted_payload is None:
            extracted_payload = {
                'platform_name': payload.get('platform_name'),
                'gross_amount': payload.get('gross_amount'),
                'platform_deduction': payload.get('platform_deduction', 0),
                'net_amount': payload.get('net_amount'),
                'deduction_label': payload.get('deduction_label')
            }

        actual_payload = payload.get('actual_data')
        if actual_payload is None:
            actual_payload = {
                'platform_name': payload.get('actual_platform_name', 'unknown'),
                'gross_amount': payload.get('actual_gross_amount', 0),
                'platform_deduction': payload.get('actual_platform_deduction', 0),
                'net_amount': payload.get('actual_net_amount', 0)
            }

        extracted_data = ReceiptExtraction.model_validate(extracted_payload)
        actual_data = ActualEarningData.model_validate(actual_payload)

        normalized_deduction = round(max(float(extracted_data.platform_deduction), 0.0), 2)
        normalized_gross = round(max(float(extracted_data.gross_amount), 0.0), 2)
        normalized_net = round(max(normalized_gross - normalized_deduction, 0.0), 2)

        extracted_data = extracted_data.model_copy(
            update={
                'gross_amount': normalized_gross,
                'platform_deduction': normalized_deduction,
                'net_amount': normalized_net
            }
        )

        confidence_raw = payload.get('confidence_score')
        confidence_score = float(confidence_raw) if confidence_raw is not None else None

        return AgentVerificationOutput(
            image_url=image_url,
            extracted_data=extracted_data,
            actual_data=actual_data,
            confidence_score=confidence_score
        )

    def _fallback_evaluation(self, worker_id: str, session_id: str) -> AgentVerificationOutput:
        evidence_payload = self._earnings_adapter.fetch_evidence_by_worker_session(worker_id, session_id)
        evidence = evidence_payload.get('evidence') or {}
        image_url = str(evidence.get('image_url', '')).strip()
        if not image_url:
            raise ValueError('image_url not found in evidence payload')

        earning_payload = self._earnings_adapter.fetch_earning_by_worker_session(worker_id, session_id)
        actual_data = self._actual_from_earning_payload(earning_payload)

        extracted_data = self._vision_analyzer.analyze(image_url)

        return AgentVerificationOutput(
            image_url=image_url,
            extracted_data=extracted_data,
            actual_data=actual_data,
            confidence_score=None
        )

    def _actual_from_earning_payload(self, payload: dict) -> ActualEarningData:
        earning_data = payload.get('earning') or {}
        session_data = payload.get('session') or earning_data.get('session') or {}

        platform_name = str(session_data.get('platform') or 'unknown').strip() or 'unknown'

        gross_amount = round(max(float(earning_data.get('gross_earned') or 0.0), 0.0), 2)
        platform_deduction = round(max(float(earning_data.get('platform_deductions') or 0.0), 0.0), 2)
        net_amount = round(max(float(earning_data.get('net_received') or 0.0), 0.0), 2)

        return ActualEarningData(
            platform_name=platform_name,
            gross_amount=gross_amount,
            platform_deduction=platform_deduction,
            net_amount=net_amount
        )
