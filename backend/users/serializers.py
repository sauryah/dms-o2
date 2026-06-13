from rest_framework import serializers
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'email', 'is_active', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def validate_role(self, value):
        if value == 'ROOT':
            if self.instance and self.instance.role == 'ROOT':
                return value
            raise serializers.ValidationError("The ROOT role cannot be created or assigned via the API.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Ensure only Root or Admin can create admins, but view-level permissions handle this
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
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
