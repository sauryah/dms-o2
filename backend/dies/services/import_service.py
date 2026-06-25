import csv
import logging
import openpyxl
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie
from machines.models import Set
from users.middleware import _thread_locals
from dies.services.validation_service import ValidationService
from dies.services.search_service import SearchService

logger = logging.getLogger(__name__)

class ImportService:
    @staticmethod
    def import_dies(file_path: str, file_ext: str, user) -> dict:
        # Associate user with current thread for DieHistory tracking
        _thread_locals.user = user
        _thread_locals.skip_single_sync = True

        try:
            created = 0
            updated = 0
            skipped = 0
            errors = []
            successful_die_ids = []

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
                logger.exception("Failed to parse uploaded spreadsheet file for import")
                return {
                    'created': 0,
                    'updated': 0,
                    'skipped': 0,
                    'errors': [{'row': 0, 'error': f"Failed to parse file: {str(e)}"}]
                }

            # Pre-cache all Sets to eliminate N+1 database reads
            all_sets = list(Set.objects.select_related('machine').all())
            sets_by_id = {s.id: s for s in all_sets}
            
            # Group by name for iexact lookups
            sets_by_name = {}
            for s in all_sets:
                name_lower = s.name.lower()
                if name_lower not in sets_by_name:
                    sets_by_name[name_lower] = []
                sets_by_name[name_lower].append(s)

            with transaction.atomic():
                for line_num, row_data in rows:
                    try:
                        # Validate required fields
                        die_id = row_data.get('die_id')
                        if not die_id:
                            raise ValueError("Missing 'die_id'")
                        die_id = str(die_id).strip()

                        die_type = ValidationService.validate_die_type(row_data.get('die_type'))
                        casing = row_data.get('casing')
                        if not casing:
                            raise ValueError("Missing 'casing'")
                        casing = str(casing).strip()

                        status_val = ValidationService.validate_status(row_data.get('status'))

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
                                    set_id_int = int(float(current_set_val_str))
                                    current_set = sets_by_id.get(set_id_int)
                                    if not current_set:
                                        raise ValueError(f"Set with ID '{current_set_val_str}' does not exist")
                                except (ValueError, TypeError):
                                    raise ValueError(f"Set with ID '{current_set_val_str}' does not exist")
                            else:
                                set_name_val = current_set_val_str

                        if not current_set and set_name_val:
                            set_name_str = str(set_name_val).strip().lower()
                            qs = sets_by_name.get(set_name_str, [])
                            if len(qs) == 1:
                                current_set = qs[0]
                            elif len(qs) > 1:
                                if machine_name_val:
                                    mach_name_str = str(machine_name_val).strip().lower()
                                    filtered = [s for s in qs if s.machine.name.lower() == mach_name_str]
                                    if len(filtered) == 1:
                                        current_set = filtered[0]
                                    elif len(filtered) > 1:
                                        raise ValueError(f"Multiple sets named '{set_name_val}' found under machine '{machine_name_val}'")
                                    else:
                                        raise ValueError(f"Set '{set_name_val}' not found under machine '{machine_name_val}'")
                                else:
                                    raise ValueError(f"Multiple sets named '{set_name_val}' exist. Please specify a unique set name or provide the machine_name to resolve ambiguity.")
                            else:
                                raise ValueError(f"Set with name '{set_name_val}' does not exist")

                        with transaction.atomic():
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
                                orig_size = ValidationService.validate_decimal(row_data.get('original_size'), 'original_size')
                                curr_size = ValidationService.validate_decimal(row_data.get('current_size'), 'current_size')

                                RoundDie.objects.update_or_create(
                                    die=die,
                                    defaults={
                                        'original_size': orig_size,
                                        'current_size': curr_size,
                                    }
                                )
                            else:  # FLAT
                                orig_width = ValidationService.validate_decimal(row_data.get('original_width'), 'original_width')
                                curr_width = ValidationService.validate_decimal(row_data.get('current_width'), 'current_width')
                                orig_thick = ValidationService.validate_decimal(row_data.get('original_thickness'), 'original_thickness')
                                curr_thick = ValidationService.validate_decimal(row_data.get('current_thickness'), 'current_thickness')
                                radius = ValidationService.validate_decimal(row_data.get('radius'), 'radius')

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

                            successful_die_ids.append(die.id)
                            if is_created:
                                created += 1
                            else:
                                updated += 1

                    except Exception as e:
                        logger.error(
                            f"Failed to import row {line_num} due to error: {str(e)}",
                            exc_info=True,
                            extra={'row': line_num, 'die_id': row_data.get('die_id')}
                        )
                        errors.append({
                            'row': line_num,
                            'error': str(e)
                        })

            if successful_die_ids:
                SearchService.sync_dies_batch(successful_die_ids)
                SearchService.broadcast_bulk_import()

            return {
                'created': created,
                'updated': updated,
                'skipped': skipped,
                'errors': errors
            }
        finally:
            if hasattr(_thread_locals, 'user'):
                del _thread_locals.user
            if hasattr(_thread_locals, 'skip_single_sync'):
                del _thread_locals.skip_single_sync
