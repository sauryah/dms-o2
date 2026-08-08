from history.models import DieHistory

def create_historical_die_entry(die, field_name, old_value, new_value, timestamp):
    """
    Creates a DieHistory record and updates its timestamp directly in the database
    to bypass Django's auto_now_add=True restriction.
    """
    record = DieHistory.objects.create(
        die=die,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value
    )
    DieHistory.objects.filter(pk=record.pk).update(timestamp=timestamp)
    record.refresh_from_db()
    return record
