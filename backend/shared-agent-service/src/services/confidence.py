from src.models.schemas import ActualEarningData, ReceiptExtraction


def _normalized_match(left: str, right: str) -> float:
    left_normalized = (left or '').strip().lower()
    right_normalized = (right or '').strip().lower()
    if not left_normalized or not right_normalized:
        return 0.0
    return 1.0 if left_normalized == right_normalized else 0.0


def _numeric_similarity(observed: float, expected: float) -> float:
    denominator = max(abs(expected), 1.0)
    delta = abs(observed - expected)
    score = 1.0 - (delta / denominator)
    return max(0.0, min(score, 1.0))


def calculate_confidence_score(extracted: ReceiptExtraction, actual: ActualEarningData) -> float:
    platform_score = _normalized_match(extracted.platform_name, actual.platform_name)
    gross_score = _numeric_similarity(extracted.gross_amount, actual.gross_amount)
    deduction_score = _numeric_similarity(extracted.platform_deduction, actual.platform_deduction)
    net_score = _numeric_similarity(extracted.net_amount, actual.net_amount)

    weighted = (
        (0.20 * platform_score)
        + (0.35 * gross_score)
        + (0.20 * deduction_score)
        + (0.25 * net_score)
    )

    return round(weighted * 100, 2)
