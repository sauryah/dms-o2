import logging
from decimal import Decimal
from django.utils import timezone
from dies.models import Die, DieTolerance, WearAlert

logger = logging.getLogger(__name__)

class WearAlertService:
    @staticmethod
    def get_or_create_default_tolerance(die_type):
        """
        Retrieves tolerance configuration or initializes default values.
        """
        defaults = {
            'max_wear_mm': Decimal('0.050') if die_type == 'ROUND' else Decimal('0.100'),
            'warning_percentage': 70,
            'critical_percentage': 90
        }
        tolerance, created = DieTolerance.objects.get_or_create(
            die_type=die_type,
            defaults=defaults
        )
        return tolerance

    @staticmethod
    def check_wear_alerts(die):
        """
        Calculates current wear and creates, updates, or resolves alerts accordingly.
        """
        try:
            tolerance = WearAlertService.get_or_create_default_tolerance(die.die_type)
            max_wear_mm = float(tolerance.max_wear_mm)
            warning_pct = float(tolerance.warning_percentage)
            critical_pct = float(tolerance.critical_percentage)
            
            wear = 0.0
            
            if die.die_type == 'ROUND':
                if not hasattr(die, 'rounddie') or not die.rounddie:
                    return
                punched = float(die.rounddie.punched_size)
                current = float(die.rounddie.current_size)
                wear = abs(current - punched)
                
            elif die.die_type == 'FLAT':
                if not hasattr(die, 'flatdie') or not die.flatdie:
                    return
                p_width = float(die.flatdie.punched_width)
                c_width = float(die.flatdie.current_width)
                p_thick = float(die.flatdie.punched_thickness)
                c_thick = float(die.flatdie.current_thickness)
                
                wear = max(abs(c_width - p_width), abs(c_thick - p_thick))
            
            if max_wear_mm <= 0:
                logger.warning(f"Invalid max wear mm value for {die.die_type} tolerance configuration")
                return

            wear_pct = (wear / max_wear_mm) * 100.0
            
            target_level = None
            message = ""
            
            if wear_pct >= critical_pct:
                target_level = 'CRITICAL'
                message = f"Critical wear limit exceeded: {wear:.3f} mm (Tolerance limit: {tolerance.max_wear_mm:.3f} mm)."
            elif wear_pct >= warning_pct:
                target_level = 'WARNING'
                message = f"Warning wear limit reached: {wear:.3f} mm ({wear_pct:.1f}% of limit)."
            
            # Fetch active alert if any
            active_alert = WearAlert.objects.filter(die=die, is_resolved=False).first()
            
            if target_level:
                # An alert should be active
                if active_alert:
                    if active_alert.alert_level != target_level:
                        # Alert level escalated or de-escalated, resolve old and create new
                        active_alert.is_resolved = True
                        active_alert.resolved_at = timezone.now()
                        active_alert.save()
                        
                        WearAlert.objects.create(
                            die=die,
                            alert_level=target_level,
                            message=message
                        )
                        logger.info(f"Wear alert level changed to {target_level} for die {die.die_id}")
                else:
                    # No active alert, create a new one
                    WearAlert.objects.create(
                        die=die,
                        alert_level=target_level,
                        message=message
                    )
                    logger.info(f"New wear alert {target_level} created for die {die.die_id}")
            else:
                # No alert should be active, resolve any existing active alert
                if active_alert:
                    active_alert.is_resolved = True
                    active_alert.resolved_at = timezone.now()
                    active_alert.save()
                    logger.info(f"Active wear alert resolved for die {die.die_id}")
                    
        except Exception as e:
            logger.error(f"Error checking wear alerts for die {die.die_id}: {e}", exc_info=True)
