from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from dies.models import Die
from dies.serializers import DieListSerializer, DieDetailSerializer, DieCreateSerializer
from users.permissions import IsAdminOrRoot
from search.meili import client as meili_client

class DieViewSet(viewsets.ModelViewSet):
    queryset = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine')
    lookup_field = 'die_id'
    permission_classes = [IsAdminOrRoot]

    def get_serializer_class(self):
        if self.action == 'list':
            return DieListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return DieCreateSerializer
        return DieDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Query parameters for filtering
        die_type = self.request.query_params.get('die_type')
        status_val = self.request.query_params.get('status')
        casing = self.request.query_params.get('casing')
        location = self.request.query_params.get('location')
        
        # Range queries for ROUND size and FLAT width/thickness
        size_min = self.request.query_params.get('size_min')
        size_max = self.request.query_params.get('size_max')
        
        width_min = self.request.query_params.get('width_min')
        width_max = self.request.query_params.get('width_max')
        thick_min = self.request.query_params.get('thick_min')
        thick_max = self.request.query_params.get('thick_max')
        
        if die_type:
            queryset = queryset.filter(die_type=die_type)
        if status_val:
            queryset = queryset.filter(status=status_val)
        if casing:
            queryset = queryset.filter(casing=casing)
        if location:
            queryset = queryset.filter(location__icontains=location)
            
        if size_min:
            queryset = queryset.filter(rounddie__current_size__gte=size_min)
        if size_max:
            queryset = queryset.filter(rounddie__current_size__lte=size_max)
            
        if width_min:
            queryset = queryset.filter(flatdie__current_width__gte=width_min)
        if width_max:
            queryset = queryset.filter(flatdie__current_width__lte=width_max)
        if thick_min:
            queryset = queryset.filter(flatdie__current_thickness__gte=thick_min)
        if thick_max:
            queryset = queryset.filter(flatdie__current_thickness__lte=thick_max)
            
        return queryset

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_dies(request):
    q = request.query_params.get('q', '')
    die_type = request.query_params.get('die_type')
    status_val = request.query_params.get('status')
    location = request.query_params.get('location')
    casing = request.query_params.get('casing')
    
    size_min = request.query_params.get('size_min')
    size_max = request.query_params.get('size_max')
    width_min = request.query_params.get('width_min')
    width_max = request.query_params.get('width_max')
    thick_min = request.query_params.get('thick_min')
    thick_max = request.query_params.get('thick_max')

    # If search query q is empty, query PostgreSQL directly to avoid Meilisearch's default hit limits
    if not q:
        try:
            dies = Die.objects.all().select_related('rounddie', 'flatdie', 'current_set__machine')
            if die_type:
                dies = dies.filter(die_type=die_type)
            if status_val:
                dies = dies.filter(status=status_val)
            if location:
                dies = dies.filter(location__icontains=location)
            if casing:
                dies = dies.filter(casing=casing)
                
            if size_min:
                dies = dies.filter(rounddie__current_size__gte=size_min)
            if size_max:
                dies = dies.filter(rounddie__current_size__lte=size_max)
                
            if width_min:
                dies = dies.filter(flatdie__current_width__gte=width_min)
            if width_max:
                dies = dies.filter(flatdie__current_width__lte=width_max)
                
            if thick_min:
                dies = dies.filter(flatdie__current_thickness__gte=thick_min)
            if thick_max:
                dies = dies.filter(flatdie__current_thickness__lte=thick_max)
                
            # Limit direct database query results to first 1000 items
            serializer = DieListSerializer(dies[:1000], many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # If search query q is present, query Meilisearch first
    filters = []
    if die_type:
        filters.append(f"die_type = '{die_type}'")
    if status_val:
        filters.append(f"status = '{status_val}'")
    if location:
        filters.append(f"location = '{location}'")
    if casing:
        filters.append(f"casing = '{casing}'")
        
    search_params = {'limit': 1000}  # Fetch up to 1000 hits to avoid 20-hit truncation before DB range filter
    if filters:
        search_params['filter'] = " AND ".join(filters)
        
    try:
        index = meili_client.index('dies')
        results = index.search(q, search_params)
        hit_ids = [hit['id'] for hit in results['hits']]
        
        dies = Die.objects.filter(die_id__in=hit_ids).select_related('rounddie', 'flatdie', 'current_set__machine')
        
        if size_min:
            dies = dies.filter(rounddie__current_size__gte=size_min)
        if size_max:
            dies = dies.filter(rounddie__current_size__lte=size_max)
            
        if width_min:
            dies = dies.filter(flatdie__current_width__gte=width_min)
        if width_max:
            dies = dies.filter(flatdie__current_width__lte=width_max)
            
        if thick_min:
            dies = dies.filter(flatdie__current_thickness__gte=thick_min)
        if thick_max:
            dies = dies.filter(flatdie__current_thickness__lte=thick_max)
            
        die_map = {d.die_id: d for d in dies}
        ordered_dies = [die_map[hid] for hid in hit_ids if hid in die_map]
        
        serializer = DieListSerializer(ordered_dies, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import tempfile
import os
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
import importlib
import_module_dies = importlib.import_module("dies.import")
import_dies = import_module_dies.import_dies

class ImportDiesView(APIView):
    permission_classes = [IsAdminOrRoot]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        name, ext = os.path.splitext(file_obj.name)
        if ext.lower() not in ['.csv', '.xlsx']:
            return Response({"error": "Unsupported file format. Only CSV and XLSX are supported."}, status=status.HTTP_400_BAD_REQUEST)

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
            for chunk in file_obj.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        try:
            result = import_dies(temp_path, ext, request.user)
            return Response(result, status=status.HTTP_200_OK)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

