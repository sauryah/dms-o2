from django.db import transaction
from django.db.models import Q
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from history.models import DieHistory
from history.serializers import AuditDieHistorySerializer, DashboardDieHistorySerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from users.permissions import IsAdminOrRootOnly
from django.core.cache import cache

class DieHistoryPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

@method_decorator(transaction.non_atomic_requests, name='dispatch')
class DieHistoryListView(APIView):
    permission_classes = [IsAdminOrRootOnly]
    
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
            
        ip = request.query_params.get('ip')
        if ip:
            queryset = queryset.filter(ip_address__icontains=ip)
            
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(note__icontains=search) |
                Q(old_value__icontains=search) |
                Q(new_value__icontains=search)
            )
            
        paginator = DieHistoryPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AuditDieHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        serializer = AuditDieHistorySerializer(queryset, many=True)
        return Response(serializer.data)


from history.models import MachineHistory
from history.serializers import AuditMachineHistorySerializer

class MachineHistoryPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

@method_decorator(transaction.non_atomic_requests, name='dispatch')
class MachineHistoryListView(APIView):
    permission_classes = [IsAdminOrRootOnly]

    @extend_schema(
        parameters=[
            OpenApiParameter('entity_type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Entity Type (MACHINE/SET/CATEGORY)'),
            OpenApiParameter('entity_name', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Entity Name'),
            OpenApiParameter('action', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Action (CREATED/UPDATED/DELETED)'),
            OpenApiParameter('user', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Username'),
            OpenApiParameter('from', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('to', OpenApiTypes.STR, OpenApiParameter.QUERY, description='End date (YYYY-MM-DD)'),
            OpenApiParameter('field', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by field name'),
            OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Page number'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Items per page'),
        ],
        responses={200: AuditMachineHistorySerializer(many=True)},
        description="Retrieve paginated history list of changes for machines, sets, and categories."
    )
    def get(self, request, *args, **kwargs):
        queryset = MachineHistory.objects.all().select_related('changed_by')

        # Optional filters
        entity_type = request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        entity_name = request.query_params.get('entity_name')
        if entity_name:
            queryset = queryset.filter(entity_name__icontains=entity_name)

        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

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

        ip = request.query_params.get('ip')
        if ip:
            queryset = queryset.filter(ip_address__icontains=ip)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(old_value__icontains=search) |
                Q(new_value__icontains=search)
            )

        paginator = MachineHistoryPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AuditMachineHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AuditMachineHistorySerializer(queryset, many=True)
        return Response(serializer.data)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class DashboardHistoryListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter('field', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by field name'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Items per page'),
        ],
        responses={200: DashboardDieHistorySerializer(many=True)},
        description="Retrieve limited, non-sensitive status changes and recent activities for the dashboard."
    )
    def get(self, request, *args, **kwargs):
        field = request.query_params.get('field', '')
        page_size = request.query_params.get('page_size', '10')
        
        # Validate page size (max 100 for safety)
        try:
            limit = min(int(page_size), 100)
        except ValueError:
            limit = 10

        # Construct cache key based on query parameters
        cache_key = f"dashboard_history_{field}_{limit}"
        
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Query only non-sensitive field history
        queryset = DieHistory.objects.all().select_related('die', 'changed_by')
        if field:
            queryset = queryset.filter(field_name__icontains=field)
        
        # Limit to the requested size
        queryset = queryset[:limit]
        
        serializer = DashboardDieHistorySerializer(queryset, many=True)
        response_data = serializer.data
        
        # Cache for 60 seconds (cleared automatically by DieHistory signals)
        cache.set(cache_key, response_data, 60)
        
        return Response(response_data)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class UnifiedHistoryListView(APIView):
    permission_classes = [IsAdminOrRootOnly]

    @extend_schema(
        parameters=[
            OpenApiParameter('user', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by Username'),
            OpenApiParameter('from', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('to', OpenApiTypes.STR, OpenApiParameter.QUERY, description='End date (YYYY-MM-DD)'),
            OpenApiParameter('ip', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by IP address'),
            OpenApiParameter('search', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Search notes or values'),
            OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Page number'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Items per page'),
        ],
        responses={200: OpenApiTypes.OBJECT},
        description="Retrieve chronological unified history list of changes for dies and machines."
    )
    def get(self, request, *args, **kwargs):
        user = request.query_params.get('user')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        ip = request.query_params.get('ip')
        search = request.query_params.get('search')

        # 1. DieHistory
        dh_qs = DieHistory.objects.all().select_related('die', 'changed_by')
        if user:
            dh_qs = dh_qs.filter(changed_by__username__icontains=user)
        if from_date:
            dh_qs = dh_qs.filter(timestamp__date__gte=from_date)
        if to_date:
            dh_qs = dh_qs.filter(timestamp__date__lte=to_date)
        if ip:
            dh_qs = dh_qs.filter(ip_address__icontains=ip)
        if search:
            dh_qs = dh_qs.filter(
                Q(note__icontains=search) |
                Q(old_value__icontains=search) |
                Q(new_value__icontains=search)
            )

        # 2. MachineHistory
        mh_qs = MachineHistory.objects.all().select_related('changed_by')
        if user:
            mh_qs = mh_qs.filter(changed_by__username__icontains=user)
        if from_date:
            mh_qs = mh_qs.filter(timestamp__date__gte=from_date)
        if to_date:
            mh_qs = mh_qs.filter(timestamp__date__lte=to_date)
        if ip:
            mh_qs = mh_qs.filter(ip_address__icontains=ip)
        if search:
            mh_qs = mh_qs.filter(
                Q(old_value__icontains=search) |
                Q(new_value__icontains=search)
            )

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 25))
        limit = page * page_size

        dh_list = list(dh_qs[:limit])
        mh_list = list(mh_qs[:limit])

        serialized = []
        for x in dh_list:
            serialized.append({
                'id': f"die_{x.id}",
                'entity_type': 'DIE',
                'entity_id': x.die.id,
                'entity_name': x.die.die_id,
                'action': 'UPDATED',
                'field_name': x.field_name,
                'old_value': x.old_value,
                'new_value': x.new_value,
                'changed_by_username': x.changed_by.username if x.changed_by else 'System',
                'timestamp': x.timestamp.isoformat(),
                'ip_address': x.ip_address,
                'note': x.note,
            })
        for x in mh_list:
            serialized.append({
                'id': f"machine_{x.id}",
                'entity_type': x.entity_type,
                'entity_id': x.entity_id,
                'entity_name': x.entity_name,
                'action': x.action,
                'field_name': x.field_name,
                'old_value': x.old_value,
                'new_value': x.new_value,
                'changed_by_username': x.changed_by.username if x.changed_by else 'System',
                'timestamp': x.timestamp.isoformat(),
                'ip_address': x.ip_address,
                'note': '',
            })

        serialized.sort(key=lambda item: item['timestamp'], reverse=True)

        start = (page - 1) * page_size
        end = start + page_size
        paginated_data = serialized[start:end]

        total_count = dh_qs.count() + mh_qs.count()

        return Response({
            'count': total_count,
            'results': paginated_data
        })

