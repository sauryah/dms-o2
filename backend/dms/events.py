import json
import logging
from django.db import connection

logger = logging.getLogger(__name__)

def broadcast_event(event_type, payload=None):
    """
    Broadcasts a real-time event to all listening clients using PostgreSQL LISTEN/NOTIFY.
    """
    try:
        connection.ensure_connection()
        conn = connection.connection
        if conn:
            cursor = conn.cursor()
            event_data = {
                'type': event_type,
                'data': payload or {}
            }
            payload_str = json.dumps(event_data)
            cursor.execute("SELECT pg_notify('dms_events', %s);", [payload_str])
            cursor.close()
    except Exception:
        logger.exception("Failed to broadcast event: %s", event_type)
