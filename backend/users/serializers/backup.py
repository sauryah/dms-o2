from rest_framework import serializers

class BackupSerializer(serializers.Serializer):
    filename = serializers.CharField()
    size_kb = serializers.FloatField(required=False)
    created_at = serializers.DateTimeField(required=False)


class BackupFilenameSerializer(serializers.Serializer):
    filename = serializers.CharField()


class BackupUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
