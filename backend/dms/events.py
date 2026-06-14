import json
from django.db import connection

def broadcast_event(event_type, payload=None):
    """
    Broadcasts a real-time event to all listening clients using PostgreSQL LISTEN/NOTIFY.
    """
    try:
        connection.ensure_connection()
        conn = connection.connection
        if conn:
            # Check if pg_notify exists and connection is valid
            cursor = conn.cursor()
            event_data = {
                'type': event_type,
                'data': payload or {}
            }
            payload_str = json.dumps(event_data)
            cursor.execute("SELECT pg_notify('dms_events', %s);", [payload_str])
            cursor.close()
    except Exception:
        # Gracefully handle failures to ensure transactions are not blocked
        pass
