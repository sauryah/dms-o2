import io
import openpyxl
from django.db import transaction
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from dies.models import Die, ImportLog, MaintenanceLog
from dies.serializers import (
    DieListSerializer, DieDetailSerializer, DieCreateSerializer, 
    serialize_die_list_fast, ImportLogSerializer, MaintenanceLogSerializer
)
from users.permissions import IsAdminOrRoot, IsAdminOrRootOrOperatorRelocate
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
    
    **Permissions:** ADMIN, ROOT or OPERATOR (for relocation only)
    
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine', 'rack')
    lookup_field = 'die_id'
    lookup_value_regex = '[^?#]+'
    permission_classes = [IsAdminOrRootOrOperatorRelocate]

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

    @action(detail=True, methods=['get', 'post'], url_path='maintenance-logs')
    def maintenance_logs(self, request, die_id=None):
        die = self.get_object()
        if request.method == 'GET':
            logs = die.maintenance_logs.select_related('created_by').all()
            serializer = MaintenanceLogSerializer(logs, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = MaintenanceLogSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(die=die, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='recut')
    @transaction.atomic
    def recut(self, request, die_id=None):
        die = self.get_object()
        
        # Check permissions: ADMIN or ROOT only
        if request.user.role not in ['ADMIN', 'ROOT'] and not request.user.is_superuser:
            return Response({"detail": "Only Admin or Root can recut dies."}, status=status.HTTP_403_FORBIDDEN)
            
        note = request.data.get('note', '').strip()
        if not note:
            return Response({"detail": "A note explaining the recut is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from decimal import Decimal, InvalidOperation
        
        if die.die_type == 'ROUND':
            new_size_val = request.data.get('new_size')
            if not new_size_val:
                return Response({"detail": "new_size is required for ROUND die."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                new_size = Decimal(str(new_size_val))
            except (ValueError, InvalidOperation):
                return Response({"detail": "Invalid new_size value."}, status=status.HTTP_400_BAD_REQUEST)
                
            if not hasattr(die, 'rounddie') or not die.rounddie:
                return Response({"detail": "Round die details not found."}, status=status.HTTP_400_BAD_REQUEST)
                
            old_punched = die.rounddie.punched_size
            old_current = die.rounddie.current_size
            
            if new_size <= old_current:
                return Response({"detail": f"New recut size ({new_size}) must be greater than current size ({old_current})."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Update specifications
            die.rounddie.punched_size = new_size
            die.rounddie.current_size = new_size
            die.rounddie.save()
            
            # Reset status and save die to trigger signals
            die.status = 'AVAILABLE'
            die.save()
            
            # Create Maintenance Log
            MaintenanceLog.objects.create(
                die=die,
                created_by=request.user,
                category='RECUT',
                note=f"Die recut from {old_current} mm (punched: {old_punched} mm) to {new_size} mm. Note: {note}"
            )
            
        elif die.die_type == 'FLAT':
            new_width_val = request.data.get('new_width')
            new_thickness_val = request.data.get('new_thickness')
            new_radius_val = request.data.get('new_radius')
            
            if not new_width_val or not new_thickness_val or new_radius_val is None:
                return Response({"detail": "new_width, new_thickness, and new_radius are required for FLAT die."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                new_width = Decimal(str(new_width_val))
                new_thickness = Decimal(str(new_thickness_val))
                new_radius = Decimal(str(new_radius_val))
            except (ValueError, InvalidOperation):
                return Response({"detail": "Invalid decimal values for flat die."}, status=status.HTTP_400_BAD_REQUEST)
                
            if not hasattr(die, 'flatdie') or not die.flatdie:
                return Response({"detail": "Flat die details not found."}, status=status.HTTP_400_BAD_REQUEST)
                
            old_width = die.flatdie.current_width
            old_thickness = die.flatdie.current_thickness
            old_radius = die.flatdie.radius
            
            if new_width < old_width:
                return Response({"detail": f"New width ({new_width}) cannot be smaller than current width ({old_width})."}, status=status.HTTP_400_BAD_REQUEST)
            if new_thickness < old_thickness:
                return Response({"detail": f"New thickness ({new_thickness}) cannot be smaller than current thickness ({old_thickness})."}, status=status.HTTP_400_BAD_REQUEST)
                
            die.flatdie.punched_width = new_width
            die.flatdie.current_width = new_width
            die.flatdie.punched_thickness = new_thickness
            die.flatdie.current_thickness = new_thickness
            die.flatdie.radius = new_radius
            die.flatdie.save()
            
            # Reset status and save die to trigger signals
            die.status = 'AVAILABLE'
            die.save()
            
            # Create Maintenance Log
            MaintenanceLog.objects.create(
                die=die,
                created_by=request.user,
                category='RECUT',
                note=f"Die recut: width {old_width}->{new_width} mm, thickness {old_thickness}->{new_thickness} mm, radius {old_radius}->{new_radius} mm. Note: {note}"
            )
            
        else:
            return Response({"detail": "Unsupported die type."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"detail": "Die recut successfully."}, status=status.HTTP_200_OK)


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
    - For ROUND: punched_size, current_size
    - For FLAT: punched_width, current_width, punched_thickness, current_thickness, radius
    
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

        dry_run = request.query_params.get('dry_run', '').lower() == 'true'

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
            for chunk in file_obj.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        try:
            import redis
            import json
            from django.conf import settings
            from dies.tasks import import_dies_task

            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            initial_status = {
                "status": "importing",
                "progress": 0,
                "total": 100,
                "filename": file_obj.name,
                "dry_run": dry_run
            }
            r.set('import_status', json.dumps(initial_status))

            import_dies_task.delay(temp_path, ext, request.user.username, file_obj.name, dry_run=dry_run)
            
            return Response({
                "detail": "Import started in background",
                "status": "importing"
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return Response({"error": f"Failed to start import task: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ImportTemplateView(APIView):
    """
    Download Excel import templates.
    """
    permission_classes = [IsAdminOrRoot]

    @extend_schema(
        responses={200: OpenApiResponse(description="Excel spreadsheet binary template file")},
        description="Download an Excel template containing tabs for Round Die and Flat Die structure, and validation rules."
    )
    def get(self, request, *args, **kwargs):
        wb = openpyxl.Workbook()
        # Sheet 1: Round Die
        ws1 = wb.active
        ws1.title = "Round Die"
        headers_round = [
            "die_id", "die_type", "casing", "status", "location", "remarks", 
            "current_set", "machine_name", "punched_size", "current_size"
        ]
        ws1.append(headers_round)
        example_round = [
            "R-999", "ROUND", "25x10", "AVAILABLE", "Rack A - Shelf 3", "Example round die",
            "Set A", "Machine A", 12.345, 12.345
        ]
        ws1.append(example_round)

        # Sheet 2: Flat Die
        ws2 = wb.create_sheet(title="Flat Die")
        headers_flat = [
            "die_id", "die_type", "casing", "status", "location", "remarks",
            "current_set", "machine_name", "punched_width", "current_width",
            "punched_thickness", "current_thickness", "radius"
        ]
        ws2.append(headers_flat)
        example_flat = [
            "F-999", "FLAT", "30x15", "AVAILABLE", "Rack B - Shelf 1", "Example flat die",
            "Set B", "Machine B", 50.123, 50.123, 15.456, 15.456, 1.500
        ]
        ws2.append(example_flat)

        # Sheet 3: Field Reference
        ws3 = wb.create_sheet(title="Field Reference")
        ws3.append(["Column Name", "Required/Optional", "Die Type", "Description / Valid Values"])
        reference_rows = [
            ["die_id", "Required", "Both", "Unique identifier for the die (e.g., R-101, F-202)"],
            ["die_type", "Required", "Both", "Must be 'ROUND' or 'FLAT'"],
            ["casing", "Required", "Both", "Physical casing dimensions (e.g., 25x10, 30x15)"],
            ["status", "Required", "Both", "Must be one of: AVAILABLE, RUNNING, CLEANING, DAMAGED, POLISHING, MEASURING, INACTIVE"],
            ["location", "Optional", "Both", "Physical location of the die (e.g. Rack A - Shelf 2)"],
            ["remarks", "Optional", "Both", "Free-form text comments"],
            ["current_set", "Optional", "Both", "The Set name or Set ID the die belongs to"],
            ["machine_name", "Optional", "Both", "Machine name to resolve duplicate set names"],
            ["punched_size", "Required", "ROUND", "Punched extrusion size currently marked on die in mm (decimal)"],
            ["current_size", "Required", "ROUND", "Current measured extrusion size in mm (decimal)"],
            ["punched_width", "Required", "FLAT", "Punched flat die width currently marked on die in mm (decimal)"],
            ["current_width", "Required", "FLAT", "Current flat die width in mm (decimal)"],
            ["punched_thickness", "Required", "FLAT", "Punched flat die thickness currently marked on die in mm (decimal)"],
            ["current_thickness", "Required", "FLAT", "Current flat die thickness in mm (decimal)"],
            ["radius", "Required", "FLAT", "Corner/bearing radius in mm (decimal)"],
        ]
        for r in reference_rows:
            ws3.append(r)

        # Autofit column widths for readability
        for sheet in [ws1, ws2, ws3]:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = max(max_len + 3, 10)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="dms_import_template.xlsx"'
        return response


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ImportLogsView(APIView):
    """
    Get paginated history of imports.
    """
    permission_classes = [IsAdminOrRoot]

    @extend_schema(
        responses={200: ImportLogSerializer(many=True)},
        description="Retrieve history of bulk imports."
    )
    def get(self, request, *args, **kwargs):
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 50
        logs = ImportLog.objects.select_related('imported_by').all()
        result_page = paginator.paginate_queryset(logs, request, view=self)
        serializer = ImportLogSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
