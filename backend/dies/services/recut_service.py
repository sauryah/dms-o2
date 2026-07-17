import logging
from decimal import Decimal, InvalidOperation
from django.db import transaction
from dies.models import Die, MaintenanceLog

logger = logging.getLogger(__name__)


class RecutService:
    @staticmethod
    @transaction.atomic
    def recut_die(die: Die, user, data: dict) -> None:
        die = Die.objects.select_for_update().get(die_id=die.die_id)

        if user.role not in ['ADMIN', 'ROOT'] and not user.is_superuser:
            raise PermissionError("Only Admin or Root can recut dies.")

        note = data.get('note', '').strip()
        if not note:
            raise ValueError("A note explaining the recut is required.")

        if die.die_type == 'ROUND':
            RecutService._recut_round(die, data, note, user)
        elif die.die_type == 'FLAT':
            RecutService._recut_flat(die, data, note, user)
        else:
            raise ValueError("Unsupported die type.")

    @staticmethod
    def _recut_round(die: Die, data: dict, note: str, user) -> None:
        new_size_val = data.get('new_size')
        if not new_size_val:
            raise ValueError("new_size is required for ROUND die.")
        try:
            new_size = Decimal(str(new_size_val))
        except (ValueError, InvalidOperation):
            raise ValueError("Invalid new_size value.")

        if not hasattr(die, 'rounddie') or not die.rounddie:
            raise ValueError("Round die details not found.")

        old_punched = die.rounddie.punched_size
        old_current = die.rounddie.current_size

        if new_size <= old_current:
            raise ValueError(f"New recut size ({new_size}) must be greater than current size ({old_current}).")

        die.rounddie.punched_size = new_size
        die.rounddie.current_size = new_size
        die.rounddie.save()

        die.status = 'AVAILABLE'
        die.save()

        MaintenanceLog.objects.create(
            die=die,
            created_by=user,
            category='RECUT',
            note=f"Die recut from {old_current} mm (punched: {old_punched} mm) to {new_size} mm. Note: {note}"
        )

    @staticmethod
    def _recut_flat(die: Die, data: dict, note: str, user) -> None:
        new_width_val = data.get('new_width')
        new_thickness_val = data.get('new_thickness')
        new_radius_val = data.get('new_radius')

        if not new_width_val or not new_thickness_val or new_radius_val is None:
            raise ValueError("new_width, new_thickness, and new_radius are required for FLAT die.")
        try:
            new_width = Decimal(str(new_width_val))
            new_thickness = Decimal(str(new_thickness_val))
            new_radius = Decimal(str(new_radius_val))
        except (ValueError, InvalidOperation):
            raise ValueError("Invalid decimal values for flat die.")

        if not hasattr(die, 'flatdie') or not die.flatdie:
            raise ValueError("Flat die details not found.")

        old_width = die.flatdie.current_width
        old_thickness = die.flatdie.current_thickness
        old_radius = die.flatdie.radius

        if new_width < old_width:
            raise ValueError(f"New width ({new_width}) cannot be smaller than current width ({old_width}).")
        if new_thickness < old_thickness:
            raise ValueError(f"New thickness ({new_thickness}) cannot be smaller than current thickness ({old_thickness}).")

        die.flatdie.punched_width = new_width
        die.flatdie.current_width = new_width
        die.flatdie.punched_thickness = new_thickness
        die.flatdie.current_thickness = new_thickness
        die.flatdie.radius = new_radius
        die.flatdie.save()

        die.status = 'AVAILABLE'
        die.save()

        MaintenanceLog.objects.create(
            die=die,
            created_by=user,
            category='RECUT',
            note=f"Die recut: width {old_width}->{new_width} mm, thickness {old_thickness}->{new_thickness} mm, radius {old_radius}->{new_radius} mm. Note: {note}"
        )
