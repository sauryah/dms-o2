from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema
from dies.services.metallurgy_service import MetallurgyService, JOHNSON_COOK_MATERIALS
from dies.serializers import (
    ArchardWearInputSerializer,
    JohnsonCookInputSerializer,
    WeibullReliabilityInputSerializer,
)


class MetallurgyWearView(APIView):
    """
    Fits Archard power-law wear progression W(t) = a * t^b
    and classifies tool wear regimes (Sub-linear polish, Steady-state abrasive, Accelerating catastrophic).
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=ArchardWearInputSerializer,
        responses={200: dict},
        description="Fit Archard wear progression model to historical tonnage and wear readings."
    )
    def post(self, request):
        serializer = ArchardWearInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        result = MetallurgyService.analyze_wear_progression(
            tonnage=data['tonnage'],
            wear_um=data['wear_um'],
            tolerance_um=data.get('tolerance_um', 8.0),
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class MetallurgyFlowStressView(APIView):
    """
    Calculates Johnson-Cook viscoplastic dynamic flow stress,
    strain-rate enhancement, thermal softening, and Taylor-Quinney adiabatic heating.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=JohnsonCookInputSerializer,
        responses={200: dict},
        description="Calculate Johnson-Cook dynamic flow stress for wire drawing alloys."
    )
    def post(self, request):
        serializer = JohnsonCookInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        result = MetallurgyService.analyze_viscoplasticity(
            material=data['material'],
            strain=data['strain'],
            strain_rate=data.get('strain_rate', 1.0),
            temperature_c=data.get('temperature_c', 20.0),
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class MetallurgyReliabilityView(APIView):
    """
    Estimates 2-parameter Weibull reliability distribution using Benard's median ranks,
    determining characteristic life eta, shape beta, B10 failure threshold, and MTTC.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=WeibullReliabilityInputSerializer,
        responses={200: dict},
        description="Fit Weibull reliability distribution to historical die failure/recut lifetimes."
    )
    def post(self, request):
        serializer = WeibullReliabilityInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        result = MetallurgyService.analyze_tool_reliability(
            lifetimes=data['lifetimes'],
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class MetallurgyMaterialsView(APIView):
    """
    Returns calibrated Johnson-Cook material parameters for wire drawing metals.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: dict},
        description="Get catalog of calibrated Johnson-Cook material parameters."
    )
    def get(self, request):
        materials = [
            {"id": key, **val}
            for key, val in JOHNSON_COOK_MATERIALS.items()
        ]
        return Response({"status": "success", "materials": materials}, status=status.HTTP_200_OK)
