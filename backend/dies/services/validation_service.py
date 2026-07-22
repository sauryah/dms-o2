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

    @staticmethod
    def validate_location(rack, shelf_number):
        """
        Validate that shelf_number is within the rack's dimensions.
        
        Args:
            rack: Rack instance or None
            shelf_number: Integer or None
            
        Returns:
            Tuple of (rack, shelf_number) or raises ValueError
        """
        if rack is None and shelf_number is None:
            return None, None
        
        if rack is not None and shelf_number is None:
            raise ValueError("shelf_number is required when rack is specified")
        
        if rack is None and shelf_number is not None:
            raise ValueError("rack is required when shelf_number is specified")
        
        # Validate shelf_number is a positive integer
        try:
            shelf_num = int(shelf_number)
        except (TypeError, ValueError):
            raise ValueError("shelf_number must be a valid integer")
        
        if shelf_num < 1:
            raise ValueError("shelf_number must be at least 1")
        
        # Calculate total slots in rack (row * column)
        total_slots = rack.row_count * rack.column_count
        
        if shelf_num > total_slots:
            raise ValueError(
                f"shelf_number {shelf_num} exceeds rack capacity. "
                f"Rack '{rack.name}' has {rack.row_count} rows x {rack.column_count} columns = {total_slots} slots"
            )
        
        return rack, shelf_num
