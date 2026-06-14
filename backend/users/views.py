import hashlib
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
from users.serializers import UserSerializer, LoginSerializer
from users.permissions import IsRootOnly

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"detail": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {"detail": "User account is inactive"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate token
        access_token = AccessToken.for_user(user)
        token_str = str(access_token)
        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()

        # Delete any existing sessions for this user (kills previous session)
        UserSession.objects.filter(user=user).delete()

        # Create new user session
        UserSession.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address=get_client_ip(request),
            device=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return Response({
            'token': token_str,
            'role': user.role
        }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsRootOnly]


class KeepAliveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response({"status": "active"}, status=status.HTTP_200_OK)
