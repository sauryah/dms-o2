from rest_framework import serializers
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'email', 'first_name', 'last_name', 'is_active', 'is_authorized_for_tools', 'authorized_tools', 'password', 'current_password']
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

        # Only ROOT users can modify roles or authorize users for tools
        if 'role' in attrs or 'is_authorized_for_tools' in attrs or 'authorized_tools' in attrs:
            if not request or not request.user or (request.user.role != 'ROOT' and not request.user.is_superuser):
                raise serializers.ValidationError({"role": "Only ROOT users can modify user roles or authorize users for tools."})

        if request and self.instance and request.user == self.instance:
            new_email = attrs.get('email')
            
            # Prevent ROOT user from demoting or deactivating themselves
            if self.instance.role == 'ROOT':
                if 'role' in attrs and attrs['role'] != 'ROOT':
                    raise serializers.ValidationError({"role": "A ROOT user cannot demote themselves."})
                if 'is_active' in attrs and not attrs['is_active']:
                    raise serializers.ValidationError({"is_active": "A ROOT user cannot deactivate themselves."})

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


class UserActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        from users.models import UserActivityLog
        model = UserActivityLog
        fields = ['id', 'user', 'username', 'action', 'timestamp', 'ip_address', 'device']


class UserSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        from users.models import UserSession
        model = UserSession
        fields = ['id', 'username', 'role', 'created_at', 'last_seen', 'ip_address', 'device']
