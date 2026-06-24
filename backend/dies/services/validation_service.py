from decimal import Decimal
from dies.models import STATUS_CHOICES

class ValidationService:
    @staticmethod
    def validate_die_type(die_type):
        if not die_type:
            raise ValueError("Missing 'die_type'")
        dt = str(die_type).strip().upper()
        if dt not in ['ROUND', 'FLAT']:
            raise ValueError(f"Invalid die_type '{dt}'. Must be ROUND or FLAT.")
        return dt

    @staticmethod
    def validate_status(status_val):
        status_values = [choice[0] for choice in STATUS_CHOICES]
        if status_val:
            s_val = str(status_val).strip().upper()
            if s_val not in status_values:
                raise ValueError(f"Invalid status '{s_val}'. Must be one of {', '.join(status_values)}.")
            return s_val
        return 'AVAILABLE'

    @staticmethod
    def validate_decimal(val, field_name):
        if val is None or val == '':
            raise ValueError(f"Missing value for '{field_name}'")
        try:
            return Decimal(str(val))
        except Exception:
            raise ValueError(f"Invalid decimal format for '{field_name}'")
