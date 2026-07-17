import logging
from django.utils import timezone
from history.models import DieHistory
from dies.services.wear_alert_service import WearAlertService

logger = logging.getLogger(__name__)


class WearPredictionService:
    @staticmethod
    def predict_die(die) -> dict:
        history_qs = DieHistory.objects.filter(die=die).order_by('timestamp')
        tolerance = WearAlertService.get_or_create_default_tolerance(die.die_type)
        tolerance_limit = float(tolerance.max_wear_mm)
        warning_pct = float(tolerance.warning_percentage)
        critical_pct = float(tolerance.critical_percentage)

        if die.die_type == 'ROUND':
            return WearPredictionService._predict_round(die, history_qs, tolerance_limit, warning_pct, critical_pct)
        elif die.die_type == 'FLAT':
            return WearPredictionService._predict_flat(die, history_qs, tolerance_limit, warning_pct, critical_pct)
        else:
            raise ValueError("Unsupported die type.")

    @staticmethod
    def _predict_round(die, history_qs, tolerance_limit, warning_pct, critical_pct) -> dict:
        if not hasattr(die, 'rounddie') or not die.rounddie:
            raise ValueError("Round die details not found.")

        history_size = history_qs.filter(field_name='current_size')
        size_pred = WearPredictionService._predict_dimension(
            die, history_size,
            die.rounddie.punched_size,
            die.rounddie.current_size,
            tolerance_limit
        )

        alert_level = WearPredictionService._determine_alert(
            size_pred['wear_percentage'], size_pred['remaining_days'],
            warning_pct, critical_pct
        )

        return {
            "die_id": die.die_id,
            "die_type": die.die_type,
            "alert_level": alert_level,
            "overall_wear_percentage": size_pred['wear_percentage'],
            "overall_remaining_days": size_pred['remaining_days'],
            "dimensions": {
                "size": size_pred
            }
        }

    @staticmethod
    def _predict_flat(die, history_qs, tolerance_limit, warning_pct, critical_pct) -> dict:
        if not hasattr(die, 'flatdie') or not die.flatdie:
            raise ValueError("Flat die details not found.")

        history_width = history_qs.filter(field_name='current_width')
        width_pred = WearPredictionService._predict_dimension(
            die, history_width,
            die.flatdie.punched_width,
            die.flatdie.current_width,
            tolerance_limit
        )

        history_thick = history_qs.filter(field_name='current_thickness')
        thick_pred = WearPredictionService._predict_dimension(
            die, history_thick,
            die.flatdie.punched_thickness,
            die.flatdie.current_thickness,
            tolerance_limit
        )

        overall_wear_pct = max(width_pred['wear_percentage'], thick_pred['wear_percentage'])

        overall_rem_days = None
        if width_pred['remaining_days'] is not None and thick_pred['remaining_days'] is not None:
            overall_rem_days = min(width_pred['remaining_days'], thick_pred['remaining_days'])
        elif width_pred['remaining_days'] is not None:
            overall_rem_days = width_pred['remaining_days']
        elif thick_pred['remaining_days'] is not None:
            overall_rem_days = thick_pred['remaining_days']

        alert_level = WearPredictionService._determine_alert(
            overall_wear_pct, overall_rem_days, warning_pct, critical_pct
        )

        return {
            "die_id": die.die_id,
            "die_type": die.die_type,
            "alert_level": alert_level,
            "overall_wear_percentage": overall_wear_pct,
            "overall_remaining_days": overall_rem_days,
            "dimensions": {
                "width": width_pred,
                "thickness": thick_pred
            }
        }

    @staticmethod
    def _determine_alert(wear_pct, remaining_days, warning_pct, critical_pct) -> str:
        if wear_pct >= critical_pct or (remaining_days is not None and remaining_days < 7):
            return 'CRITICAL'
        elif wear_pct >= warning_pct or (remaining_days is not None and remaining_days < 30):
            return 'WARNING'
        return 'GOOD'

    @staticmethod
    def _predict_dimension(die, history_entries, punched_val, current_val, tolerance_limit) -> dict:
        punched_val = float(punched_val)
        current_val = float(current_val)
        tolerance_limit = float(tolerance_limit)

        points = []
        earliest_time = die.created_at or timezone.now()

        if history_entries.exists():
            first_entry = list(history_entries)[0]
            earliest_time = first_entry.timestamp
            try:
                start_val = float(first_entry.old_value)
            except ValueError:
                start_val = punched_val
            points.append((earliest_time, start_val))

            for entry in history_entries:
                try:
                    points.append((entry.timestamp, float(entry.new_value)))
                except ValueError:
                    continue
        else:
            points.append((earliest_time, punched_val))

        points.append((timezone.now(), current_val))
        points.sort(key=lambda x: x[0])

        unique_points = []
        seen_times = set()
        for t, v in points:
            if t not in seen_times:
                unique_points.append((t, v))
                seen_times.add(t)

        total_wear = abs(current_val - punched_val)
        wear_percentage = min(100.0, (total_wear / tolerance_limit) * 100.0) if tolerance_limit > 0 else 0.0

        wear_rate = 0.0
        remaining_days = None
        rate_calculated = False

        if len(unique_points) >= 2:
            t0, v0 = unique_points[0]
            t_last, v_last = unique_points[-1]
            days_elapsed = (t_last - t0).total_seconds() / 86400.0
            if days_elapsed > 0.01:
                wear_delta = abs(v_last - v0)
                wear_rate = wear_delta / days_elapsed
                rate_calculated = True
                if wear_rate > 0:
                    remaining_wear = max(0.0, tolerance_limit - total_wear)
                    remaining_days = remaining_wear / wear_rate

        return {
            "initial_value": punched_val,
            "current_value": current_val,
            "tolerance_limit": tolerance_limit,
            "total_wear": total_wear,
            "wear_percentage": wear_percentage,
            "wear_rate_per_day": wear_rate if rate_calculated else None,
            "remaining_days": remaining_days,
            "measurements_count": len(unique_points),
        }
