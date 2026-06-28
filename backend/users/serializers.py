from rest_framework import serializers
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'email', 'first_name', 'last_name', 'is_active', 'password', 'current_password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def validate(self, attrs):
        request = self.context.get('request')
        
        # Enforce system password validation rules
        new_password = attrs.get('password')
        if new_password:
            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError
            try:
                validate_password(new_password, user=self.instance)
            except ValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})

        if request and self.instance and request.user == self.instance:
            new_email = attrs.get('email')
            
            # Require current_password when updating sensitive details (password or email)
            if new_password or (new_email and new_email != self.instance.email):
                current_password = attrs.get('current_password')
                if not current_password:
                    raise serializers.ValidationError({"current_password": "Current password is required to change password or email."})
                if not self.instance.check_password(current_password):
                    raise serializers.ValidationError({"current_password": "Incorrect current password."})
        return attrs


    def validate_role(self, value):
        if value == 'ROOT':
            if self.instance and self.instance.role == 'ROOT':
                return value
            raise serializers.ValidationError("The ROOT role cannot be created or assigned via the API.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('current_password', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


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


class BackupSerializer(serializers.Serializer):
    filename = serializers.CharField()
    size_kb = serializers.FloatField(required=False)
    created_at = serializers.DateTimeField(required=False)


class BackupFilenameSerializer(serializers.Serializer):
    filename = serializers.CharField()


class BackupUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
