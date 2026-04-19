from datetime import timedelta
from statistics import mean, pstdev

from app.models.schemas import (
    CommissionSpikeDetails,
    GhostDeductionDetails,
    ShiftSnapshot,
    WageCollapseDetails
)


class AnomalyRulesService:
    def evaluate(
        self,
        current_shift: ShiftSnapshot,
        historical_shifts: list[ShiftSnapshot],
        ghost_minimal_hours_threshold: float,
        ghost_absolute_deduction_floor: float,
        ghost_deduction_multiplier: float
    ) -> dict:
        commission_details = self._evaluate_commission_spike(current_shift, historical_shifts)
        wage_details = self._evaluate_wage_collapse(current_shift, historical_shifts)
        ghost_details = self._evaluate_ghost_deduction(
            current_shift,
            historical_shifts,
            ghost_minimal_hours_threshold,
            ghost_absolute_deduction_floor,
            ghost_deduction_multiplier
        )

        triggered_calculations: list[str] = []
        severity_scores: dict[str, float] = {}

        if commission_details.triggered:
            triggered_calculations.append('Commission Spike')
            severity_scores['Commission Spike'] = max(
                0.0,
                commission_details.current_ratio - commission_details.threshold_ratio
            )

        if wage_details.triggered:
            triggered_calculations.append('Wage Collapse')
            severity_scores['Wage Collapse'] = wage_details.drop_percentage

        if ghost_details.triggered:
            triggered_calculations.append('Ghost Deduction')
            severity_scores['Ghost Deduction'] = max(
                0.0,
                ghost_details.current_deduction_amount - ghost_details.proportional_threshold
            )

        primary_trigger = None
        if severity_scores:
            primary_trigger = max(severity_scores, key=severity_scores.get)

        return {
            'triggered_calculations': triggered_calculations,
            'primary_trigger': primary_trigger,
            'commission_spike': commission_details,
            'wage_collapse': wage_details,
            'ghost_deduction': ghost_details
        }

    def _evaluate_commission_spike(
        self,
        current_shift: ShiftSnapshot,
        historical_shifts: list[ShiftSnapshot]
    ) -> CommissionSpikeDetails:
        historical_ratios = [
            self._safe_ratio(shift.platform_deductions, shift.gross_earned)
            for shift in historical_shifts
            if shift.gross_earned > 0
        ]

        historical_avg = mean(historical_ratios) if historical_ratios else 0.0
        historical_std = pstdev(historical_ratios) if len(historical_ratios) > 1 else 0.0

        current_ratio = self._safe_ratio(current_shift.platform_deductions, current_shift.gross_earned)
        threshold_ratio = historical_avg + (2 * historical_std)

        triggered = bool(historical_ratios) and current_ratio > threshold_ratio

        z_score = None
        if historical_std > 0:
            z_score = (current_ratio - historical_avg) / historical_std

        return CommissionSpikeDetails(
            triggered=triggered,
            current_ratio=round(current_ratio, 4),
            historical_avg_ratio=round(historical_avg, 4),
            historical_std_ratio=round(historical_std, 4),
            threshold_ratio=round(threshold_ratio, 4),
            z_score=round(z_score, 4) if z_score is not None else None
        )

    def _evaluate_wage_collapse(
        self,
        current_shift: ShiftSnapshot,
        historical_shifts: list[ShiftSnapshot]
    ) -> WageCollapseDetails:
        current_hourly_rate = self._safe_ratio(current_shift.net_received, current_shift.hours_worked)

        window_start = current_shift.session_date - timedelta(days=7)
        rolling_rates = [
            self._safe_ratio(shift.net_received, shift.hours_worked)
            for shift in historical_shifts
            if window_start <= shift.session_date < current_shift.session_date and shift.hours_worked > 0
        ]

        rolling_avg = mean(rolling_rates) if rolling_rates else 0.0
        threshold_hourly_rate = rolling_avg * 0.8

        triggered = bool(rolling_rates) and current_hourly_rate < threshold_hourly_rate

        drop_percentage = 0.0
        if rolling_avg > 0:
            drop_percentage = max(0.0, ((rolling_avg - current_hourly_rate) / rolling_avg) * 100)

        return WageCollapseDetails(
            triggered=triggered,
            current_hourly_rate=round(current_hourly_rate, 2),
            rolling_avg_hourly_rate=round(rolling_avg, 2),
            threshold_hourly_rate=round(threshold_hourly_rate, 2),
            drop_percentage=round(drop_percentage, 2)
        )

    def _evaluate_ghost_deduction(
        self,
        current_shift: ShiftSnapshot,
        historical_shifts: list[ShiftSnapshot],
        ghost_minimal_hours_threshold: float,
        ghost_absolute_deduction_floor: float,
        ghost_deduction_multiplier: float
    ) -> GhostDeductionDetails:
        baseline_values = [
            self._safe_ratio(shift.platform_deductions, shift.hours_worked)
            for shift in historical_shifts
            if shift.hours_worked > 0
        ]
        baseline_deduction_per_hour = mean(baseline_values) if baseline_values else 0.0

        current_deduction_per_hour = self._safe_ratio(
            current_shift.platform_deductions,
            current_shift.hours_worked
        )

        expected_deduction = baseline_deduction_per_hour * max(current_shift.hours_worked, 0)
        proportional_threshold = max(
            ghost_absolute_deduction_floor,
            expected_deduction * ghost_deduction_multiplier
        )

        minimal_hours = current_shift.hours_worked <= ghost_minimal_hours_threshold
        triggered = (
            bool(baseline_values)
            and minimal_hours
            and current_shift.platform_deductions > 0
            and current_shift.platform_deductions >= proportional_threshold
        )

        return GhostDeductionDetails(
            triggered=triggered,
            current_hours_worked=round(current_shift.hours_worked, 2),
            current_deduction_amount=round(current_shift.platform_deductions, 2),
            deduction_per_hour=round(current_deduction_per_hour, 2),
            baseline_deduction_per_hour=round(baseline_deduction_per_hour, 2),
            proportional_threshold=round(proportional_threshold, 2)
        )

    def _safe_ratio(self, numerator: float, denominator: float) -> float:
        if denominator <= 0:
            return 0.0
        return max(0.0, numerator / denominator)
