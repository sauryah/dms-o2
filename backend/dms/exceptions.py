import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Production-grade DRF Exception Handler.
    Standardizes all API error responses into uniform JSON format:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable summary",
            "details": {...}
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = getattr(exc, 'default_code', 'api_error')
        if hasattr(error_code, '__str__'):
            error_code = str(error_code).upper()

        message = "An error occurred while processing your request."
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])
            details = {k: v for k, v in response.data.items() if k != 'detail'}
        elif isinstance(response.data, dict):
            message = "Validation or request processing failed."
            details = response.data
        elif isinstance(response.data, list):
            message = "Validation failed."
            details = {"non_field_errors": response.data}
        else:
            details = str(response.data)

        formatted_data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details if details else None,
            }
        }
        response.data = formatted_data
    else:
        # Unhandled 500 server error
        logger.error(f"Unhandled exception in API request: {exc}", exc_info=True)
        response = Response(
            {
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal server error occurred.",
                    "details": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
