import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.config import Settings
from app.models.schemas import EmpatheticExplanation
from app.prompts.anomaly_explainer_prompt import (
    ANOMALY_EXPLAINER_HUMAN_PROMPT,
    ANOMALY_EXPLAINER_SYSTEM_PROMPT
)


class AnomalyExplanationService:
    def __init__(self, settings: Settings):
        self._prompt = ChatPromptTemplate.from_messages([
            ('system', ANOMALY_EXPLAINER_SYSTEM_PROMPT),
            ('human', ANOMALY_EXPLAINER_HUMAN_PROMPT)
        ])

        self._chain = None
        if settings.groq_api_key:
            llm = ChatGroq(
                api_key=settings.groq_api_key,
                model=settings.groq_model,
                temperature=0.1
            )
            structured_llm = llm.with_structured_output(EmpatheticExplanation)
            self._chain = self._prompt | structured_llm

    def generate_explanation(
        self,
        worker_name: str | None,
        triggered_calculations: list[str],
        primary_trigger: str | None,
        commission_spike: dict,
        wage_collapse: dict,
        ghost_deduction: dict
    ) -> str:
        if not triggered_calculations:
            return 'No earnings anomaly was detected for this verified shift.'

        context = {
            'worker_name': worker_name,
            'triggered_calculations': triggered_calculations,
            'primary_trigger': primary_trigger,
            'commission_spike': commission_spike,
            'wage_collapse': wage_collapse,
            'ghost_deduction': ghost_deduction
        }

        if self._chain is not None:
            try:
                response = self._chain.invoke({'context_json': json.dumps(context, ensure_ascii=True)})
                return response.explanation
            except Exception:
                pass

        return self._fallback_explanation(worker_name, triggered_calculations, primary_trigger)

    def _fallback_explanation(
        self,
        worker_name: str | None,
        triggered_calculations: list[str],
        primary_trigger: str | None
    ) -> str:
        prefix = f'{worker_name}, ' if worker_name else ''

        if primary_trigger == 'Commission Spike':
            return (
                f'{prefix}we noticed this shift had a much higher platform deduction rate than your usual pattern. '
                'Please review the trip breakdown, and if anything looks off, consider raising a support ticket with the platform.'
            )

        if primary_trigger == 'Wage Collapse':
            return (
                f'{prefix}your take-home per hour on this shift was significantly below your recent 7-day average. '
                'It may help to double-check completed trips, wait times, and payout adjustments for this session.'
            )

        if primary_trigger == 'Ghost Deduction':
            return (
                f'{prefix}the deduction amount appears unusually high for the short time worked in this shift. '
                'Please review this payout carefully and keep a record in case you need to dispute the deduction.'
            )

        joined = ', '.join(triggered_calculations)
        return (
            f'{prefix}we detected unusual earnings behavior for this shift ({joined}). '
            'Please review the payout details carefully and keep the records if you need to escalate a discrepancy.'
        )
