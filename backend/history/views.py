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
        from django.db import connection
        
        user = request.query_params.get('user')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        ip = request.query_params.get('ip')
        search = request.query_params.get('search')
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(int(request.query_params.get('page_size', 25)), 100)
        offset = (page - 1) * page_size

        # 1. Build SELECT for DieHistory
        dh_where = []
        dh_params = []
        if user:
            dh_where.append("u.username ILIKE %s")
            dh_params.append(f"%{user}%")
        if from_date:
            dh_where.append("h.timestamp >= %s")
            dh_params.append(from_date)
        if to_date:
            dh_where.append("h.timestamp <= %s")
            dh_params.append(to_date)
        if ip:
            dh_where.append("h.ip_address ILIKE %s")
            dh_params.append(f"%{ip}%")
        if search:
            dh_where.append("(h.note ILIKE %s OR h.old_value ILIKE %s OR h.new_value ILIKE %s)")
            dh_params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            
        dh_where_str = " AND ".join(dh_where)
        if dh_where_str:
            dh_where_str = "WHERE " + dh_where_str
            
        dh_query = f"""
            SELECT 
                'DIE' AS entity_type,
                h.id,
                h.die_id AS entity_id,
                d.die_id AS entity_name,
                'UPDATED' AS action,
                h.field_name,
                h.old_value,
                h.new_value,
                u.username AS changed_by_username,
                h.timestamp,
                h.ip_address,
                h.note
            FROM history_diehistory h
            LEFT JOIN dies_die d ON h.die_id = d.id
            LEFT JOIN users_user u ON h.changed_by_id = u.id
            {dh_where_str}
        """

        # 2. Build SELECT for MachineHistory
        mh_where = []
        mh_params = []
        if user:
            mh_where.append("u.username ILIKE %s")
            mh_params.append(f"%{user}%")
        if from_date:
            mh_where.append("m.timestamp >= %s")
            mh_params.append(from_date)
        if to_date:
            mh_where.append("m.timestamp <= %s")
            mh_params.append(to_date)
        if ip:
            mh_where.append("m.ip_address ILIKE %s")
            mh_params.append(f"%{ip}%")
        if search:
            mh_where.append("(m.old_value ILIKE %s OR m.new_value ILIKE %s)")
            mh_params.extend([f"%{search}%", f"%{search}%"])
            
        mh_where_str = " AND ".join(mh_where)
        if mh_where_str:
            mh_where_str = "WHERE " + mh_where_str
            
        mh_query = f"""
            SELECT 
                m.entity_type,
                m.id,
                m.entity_id,
                m.entity_name,
                m.action,
                m.field_name,
                m.old_value,
                m.new_value,
                u.username AS changed_by_username,
                m.timestamp,
                m.ip_address,
                '' AS note
            FROM history_machinehistory m
            LEFT JOIN users_user u ON m.changed_by_id = u.id
            {mh_where_str}
        """

        # 3. Query Execution
        with connection.cursor() as cursor:
            # Get total count
            count_query = f"""
                SELECT 
                    (SELECT COUNT(*) FROM history_diehistory h LEFT JOIN users_user u ON h.changed_by_id = u.id {dh_where_str}) +
                    (SELECT COUNT(*) FROM history_machinehistory m LEFT JOIN users_user u ON m.changed_by_id = u.id {mh_where_str})
            """
            cursor.execute(count_query, dh_params + mh_params)
            total_count = cursor.fetchone()[0]
            
            # Get paginated data
            union_query = f"""
                SELECT 
                    entity_type,
                    id,
                    entity_id,
                    entity_name,
                    action,
                    field_name,
                    old_value,
                    new_value,
                    changed_by_username,
                    timestamp,
                    ip_address,
                    note
                FROM (
                    ({dh_query})
                    UNION ALL
                    ({mh_query})
                ) AS unified
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """
            params = dh_params + mh_params + [page_size, offset]
            cursor.execute(union_query, params)
            rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append({
                'id': f"{r[0].lower()}_{r[1]}",
                'entity_type': r[0],
                'entity_id': r[2],
                'entity_name': r[3],
                'action': r[4],
                'field_name': r[5],
                'old_value': r[6],
                'new_value': r[7],
                'changed_by_username': r[8] if r[8] else 'System',
                'timestamp': r[9].isoformat() if r[9] else None,
                'ip_address': r[10] or '',
                'note': r[11] or '',
            })

        return Response({
            'count': total_count,
            'results': results
        })

