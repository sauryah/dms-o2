from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from dies.models import Die
from dies.serializers import DieListSerializer, DieDetailSerializer, DieCreateSerializer, serialize_die_list_fast
from users.permissions import IsAdminOrRoot
from search.meili import client as meili_client, INDEX_NAME

class DieViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing die inventory.
    
    Supports full CRUD operations for dies with filtering and pagination.
    
    - **Create** (POST): Add new die (ROUND or FLAT type)
    - **Read** (GET): List all dies with optional filters, or retrieve single die
    - **Update** (PUT/PATCH): Modify die properties
    - **Delete** (DELETE): Remove die from inventory
    
    **Filtering Parameters (GET only):**
    - `die_type`: Filter by die type (ROUND or FLAT)
    - `status`: Filter by status (ACTIVE, INACTIVE, AVAILABLE, etc.)
    - `casing`: Filter by casing material (STEEL, CARBIDE, etc.)
    - `location`: Filter by storage location (partial match, case-insensitive)
    - `size_min`, `size_max`: Range filter for ROUND die current_size
    - `width_min`, `width_max`: Range filter for FLAT die current_width
    - `thick_min`, `thick_max`: Range filter for FLAT die current_thickness
    - `page`: Pagination (100 items per page)
    
    **Examples:**
    - List ROUND dies with size 5.0-5.5: `/api/dies/?die_type=ROUND&size_min=5.0&size_max=5.5`
    - List ACTIVE dies in RACK-A: `/api/dies/?status=ACTIVE&location=RACK-A`
    - List FLAT dies by thickness: `/api/dies/?die_type=FLAT&thick_min=2.0&thick_max=2.5`
    
    **Permissions:** ADMIN or ROOT user only
    
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine')
    lookup_field = 'die_id'
    lookup_value_regex = '[^?#]+'
    permission_classes = [IsAdminOrRoot]

    def get_serializer_class(self):
        if self.action == 'list':
            return DieListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return DieCreateSerializer
        return DieDetailSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = serialize_die_list_fast(page)
            return self.get_paginated_response(data)
        data = serialize_die_list_fast(queryset)
        return Response(data)

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


import tempfile
import os
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework import serializers
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from dies.services.import_service import ImportService

class ImportDiesView(APIView):
    """
    Bulk import dies from CSV or XLSX file.
    
    **Description:**
    Upload a spreadsheet file to create multiple dies at once.
    Supports CSV and XLSX formats with columns:
    - die_id, die_type (ROUND|FLAT), casing, status, location, current_set
    - For ROUND: original_size, current_size
    - For FLAT: original_width, current_width, original_thickness, current_thickness, radius
    
    **Request:**
    - Method: POST
    - Content-Type: multipart/form-data
    - Field: `file` (CSV or XLSX file)
    
    **Response:**
    - `201 Created`: Import completed with summary
    - `400 Bad Request`: Invalid file format or missing file
    
    **Example Response:**
    ```json
    {
      "imported": 42,
      "skipped": 3,
      "errors": [
        {"row": 5, "error": "Invalid die_type: INVALID"}
      ]
    }
    ```
    
    **Permissions:** ADMIN or ROOT user only
    **Authentication:** Required (JWT Bearer token)
    """
    permission_classes = [IsAdminOrRoot]
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={
            'multipart/form-data': inline_serializer(
                name='ImportDiesRequest',
                fields={'file': serializers.FileField()},
            )
        },
        responses={
            200: OpenApiResponse(description='Import completed with summary'),
            400: OpenApiResponse(description='Invalid file upload'),
        },
    )
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
            result = ImportService.import_dies(temp_path, ext, request.user)
            return Response(result, status=status.HTTP_200_OK)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
