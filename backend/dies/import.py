import csv
import openpyxl
from decimal import Decimal
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie, STATUS_CHOICES
from machines.models import Set
from users.middleware import _thread_locals
from search.meili import sync_die

def import_dies(file_path: str, file_ext: str, user) -> dict:
    created = 0
    updated = 0
    skipped = 0
    errors = []
    successful_die_ids = []

    # Associate user with current thread for DieHistory tracking
    _thread_locals.user = user

    rows = []
    try:
        if file_ext.lower() in ['.xlsx', 'xlsx']:
            wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
            sheet = wb.active
            headers = []
            for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                if row_idx == 0:
                    headers = [str(cell).strip().lower() for cell in row if cell is not None]
                    continue
                if not any(cell is not None for cell in row):
                    continue
                row_dict = {}
                for idx, cell in enumerate(row):
                    if idx < len(headers):
                        row_dict[headers[idx]] = cell
                rows.append((row_idx + 1, row_dict))
        else:
            with open(file_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                headers = [h.strip().lower() for h in reader.fieldnames]
                # Re-read with normalized headers
                f.seek(0)
                next(f)
                csv_reader = csv.reader(f)
                for row_idx, row in enumerate(csv_reader):
                    if not row or not any(cell.strip() for cell in row):
                        continue
                    row_dict = {}
                    for idx, cell in enumerate(row):
                        if idx < len(headers):
                            row_dict[headers[idx]] = cell.strip()
                    rows.append((row_idx + 2, row_dict))
    except Exception as e:
        if hasattr(_thread_locals, 'user'):
            del _thread_locals.user
        return {
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': [{'row': 0, 'error': f"Failed to parse file: {str(e)}"}]
        }

    status_values = [choice[0] for choice in STATUS_CHOICES]

    for line_num, row_data in rows:
        try:
            # Validate required fields
            die_id = row_data.get('die_id')
            if not die_id:
                raise ValueError("Missing 'die_id'")
            die_id = str(die_id).strip()

            die_type = row_data.get('die_type')
            if not die_type:
                raise ValueError("Missing 'die_type'")
            die_type = str(die_type).strip().upper()
            if die_type not in ['ROUND', 'FLAT']:
                raise ValueError(f"Invalid die_type '{die_type}'. Must be ROUND or FLAT.")

            casing = row_data.get('casing')
            if not casing:
                raise ValueError("Missing 'casing'")
            casing = str(casing).strip()

            status_val = row_data.get('status')
            if status_val:
                status_val = str(status_val).strip().upper()
                if status_val not in status_values:
                    raise ValueError(f"Invalid status '{status_val}'. Must be one of {', '.join(status_values)}.")
            else:
                status_val = 'AVAILABLE'

            location = row_data.get('location', '')
            if location is None:
                location = ''
            location = str(location).strip()

            remarks = row_data.get('remarks', '')
            if remarks is None:
                remarks = ''
            remarks = str(remarks).strip()

            current_set_val = row_data.get('current_set') or row_data.get('current_set_id')
            set_name_val = row_data.get('set_name')
            machine_name_val = row_data.get('machine_name') or row_data.get('machine')
            current_set = None

            if current_set_val:
                current_set_val_str = str(current_set_val).strip()
                is_numeric = False
                try:
                    float(current_set_val_str)
                    is_numeric = True
                except ValueError:
                    pass

                if is_numeric:
                    try:
                        current_set = Set.objects.get(pk=int(float(current_set_val_str)))
                    except (ValueError, TypeError, Set.DoesNotExist):
                        raise ValueError(f"Set with ID '{current_set_val_str}' does not exist")
                else:
                    set_name_val = current_set_val_str

            if not current_set and set_name_val:
                set_name_str = str(set_name_val).strip()
                qs = Set.objects.filter(name__iexact=set_name_str)
                if qs.count() == 1:
                    current_set = qs.first()
                elif qs.count() > 1:
                    if machine_name_val:
                        mach_name_str = str(machine_name_val).strip()
                        qs = qs.filter(machine__name__iexact=mach_name_str)
                        if qs.count() == 1:
                            current_set = qs.first()
                        elif qs.count() > 1:
                            raise ValueError(f"Multiple sets named '{set_name_str}' found under machine '{mach_name_str}'")
                        else:
                            raise ValueError(f"Set '{set_name_str}' not found under machine '{mach_name_str}'")
                    else:
                        raise ValueError(f"Multiple sets named '{set_name_str}' exist. Please specify a unique set name or provide the machine_name to resolve ambiguity.")
                else:
                    raise ValueError(f"Set with name '{set_name_str}' does not exist")

            with transaction.atomic():
                # update_or_create Die on die_id
                die, is_created = Die.objects.update_or_create(
                    die_id=die_id,
                    defaults={
                        'die_type': die_type,
                        'casing': casing,
                        'status': status_val,
                        'location': location,
                        'remarks': remarks,
                        'current_set': current_set,
                    }
                )

                if die_type == 'ROUND':
                    orig_size_val = row_data.get('original_size')
                    curr_size_val = row_data.get('current_size')
                    if orig_size_val is None or curr_size_val is None or orig_size_val == '' or curr_size_val == '':
                        raise ValueError("ROUND die requires 'original_size' and 'current_size'")

                    try:
                        orig_size = Decimal(str(orig_size_val))
                        curr_size = Decimal(str(curr_size_val))
                    except Exception:
                        raise ValueError("Invalid decimal format for size fields")

                    RoundDie.objects.update_or_create(
                        die=die,
                        defaults={
                            'original_size': orig_size,
                            'current_size': curr_size,
                        }
                    )
                else:  # FLAT
                    orig_width_val = row_data.get('original_width')
                    curr_width_val = row_data.get('current_width')
                    orig_thick_val = row_data.get('original_thickness')
                    curr_thick_val = row_data.get('current_thickness')
                    radius_val = row_data.get('radius')

                    if any(v is None or v == '' for v in [orig_width_val, curr_width_val, orig_thick_val, curr_thick_val, radius_val]):
                        raise ValueError("FLAT die requires 'original_width', 'current_width', 'original_thickness', 'current_thickness', and 'radius'")

                    try:
                        orig_width = Decimal(str(orig_width_val))
                        curr_width = Decimal(str(curr_width_val))
                        orig_thick = Decimal(str(orig_thick_val))
                        curr_thick = Decimal(str(curr_thick_val))
                        radius = Decimal(str(radius_val))
                    except Exception:
                        raise ValueError("Invalid decimal format for FLAT die fields")

                    FlatDie.objects.update_or_create(
                        die=die,
                        defaults={
                            'original_width': orig_width,
                            'current_width': curr_width,
                            'original_thickness': orig_thick,
                            'current_thickness': curr_thick,
                            'radius': radius,
                        }
                    )

                # Collect ID for batch sync
                successful_die_ids.append(die.id)

                if is_created:
                    created += 1
                else:
                    updated += 1

        except Exception as e:
            errors.append({
                'row': line_num,
                'error': str(e)
            })

    # Clear thread local
    if hasattr(_thread_locals, 'user'):
        del _thread_locals.user

    if successful_die_ids:
        from search.tasks import sync_dies_batch_task
        from dms.events import broadcast_event
        sync_dies_batch_task.delay(successful_die_ids)
        broadcast_event('die_update', {'action': 'bulk_import'})

    return {
        'created': created,
        'updated': updated,
        'skipped': skipped,
        'errors': errors
    }
