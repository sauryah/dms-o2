from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    client_ip = serializers.CharField(required=False, allow_blank=True, default='')


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class BackupCodeVerifySerializer(serializers.Serializer):
    mfa_token = serializers.CharField(required=True)
    code = serializers.CharField(required=True, min_length=4, max_length=32)
    client_ip = serializers.CharField(required=False, allow_blank=True, default='')


class BackupCodeGenerateSerializer(serializers.Serializer):
    password = serializers.CharField(required=False, allow_blank=True, default='', write_only=True)


class BackupCodeDisableSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)


# Backwards compatibility aliases
MFAVerifyLoginSerializer = BackupCodeVerifySerializer
MFAEnableSerializer = BackupCodeGenerateSerializer
MFADisableSerializer = BackupCodeDisableSerializer
