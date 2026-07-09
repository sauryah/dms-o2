import re
from decimal import Decimal
from dies.contracts import DIE_STATUSES, DIE_TYPES

class ValidationService:
    @staticmethod
    def validate_die_id(die_id):
        if not die_id:
            raise ValueError("Missing 'die_id'")
        val = str(die_id).strip()
        if not re.match(r'^[a-zA-Z0-9_\-./]+$', val):
            raise ValueError(
                "Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes."
            )
        return val

    @staticmethod
    def validate_die_type(die_type):
        if not die_type:
            raise ValueError("Missing 'die_type'")
        dt = str(die_type).strip().upper()
        if dt not in DIE_TYPES:
            raise ValueError(f"Invalid die_type '{dt}'. Must be one of {', '.join(DIE_TYPES)}.")
        return dt

    @staticmethod
    def validate_status(status_val):
        status_values = list(DIE_STATUSES)
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
