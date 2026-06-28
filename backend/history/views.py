from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from history.models import DieHistory
from history.serializers import AuditDieHistorySerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

class DieHistoryPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

class DieHistoryListView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter('die_id', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Die ID'),
            OpenApiParameter('user', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Username'),
            OpenApiParameter('from', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('to', OpenApiTypes.STR, OpenApiParameter.QUERY, description='End date (YYYY-MM-DD)'),
            OpenApiParameter('field', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by field name'),
            OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Page number'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Items per page'),
        ],
        responses={200: AuditDieHistorySerializer(many=True)},
        description="Retrieve paginated history list of changes for extrusion dies."
    )
    def get(self, request, *args, **kwargs):
        queryset = DieHistory.objects.all().select_related('die', 'changed_by')
        
        # Authorization check: regular users only see their own actions
        if request.user.role not in ['ADMIN', 'ROOT'] and not request.user.is_superuser:
            queryset = queryset.filter(changed_by=request.user)
            
        # Optional filters
        die_id = request.query_params.get('die_id')
        if die_id:
            queryset = queryset.filter(die__die_id__icontains=die_id)
            
        user = request.query_params.get('user')
        if user:
            queryset = queryset.filter(changed_by__username__icontains=user)
            
        field = request.query_params.get('field')
        if field:
            queryset = queryset.filter(field_name__icontains=field)
            
        from_date = request.query_params.get('from')
        if from_date:
            queryset = queryset.filter(timestamp__date__gte=from_date)
            
        to_date = request.query_params.get('to')
        if to_date:
            queryset = queryset.filter(timestamp__date__lte=to_date)
            
        paginator = DieHistoryPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AuditDieHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        serializer = AuditDieHistorySerializer(queryset, many=True)
        return Response(serializer.data)
