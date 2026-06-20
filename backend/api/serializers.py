from rest_framework import serializers
from .models import ProfessionalDevelopment, Project, AboutMe, DayLog, Task, ScrapbookStamp,OperativeNote, DreamWish, WatchlistItem, OperativeGoal,  HobbyItem, MusicVibeItem
import requests
from django.core.files.base import ContentFile
from urllib.parse import urlparse
import os

 
class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class ProfessionalDevelopmentSerializer(serializers.ModelSerializer):
    certificate_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalDevelopment
        fields = [
            'id', 'name', 'subject', 'company', 'duration',
            'certificate_image', 'certificate_image_url',
            'learnings', 'skills_acquired',
        ]

    def get_certificate_image_url(self, obj):
        if obj.certificate_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.certificate_image.url)
            return obj.certificate_image.url
        return None


class AboutMeSerializer(serializers.ModelSerializer):
    baseSecretCode = serializers.CharField(source='base_secret_code')
    sidebarCode = serializers.CharField(source='sidebar_code', required=False, allow_blank=True)
    portalDream = serializers.CharField(source='portal_dream')
    clearanceLevel = serializers.CharField(source='clearance_level', required=False)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AboutMe
        fields = [
            'id', 'name', 'address', 'phone', 'email', 
            'baseSecretCode', 'sidebarCode', 'portalDream',
            'clearanceLevel', 'timestamp'
        ]
    

class DayLogSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    file = serializers.ImageField(source='image_file', write_only=True, required=False, allow_null=True)

    class Meta:
        model = DayLog
        fields = ['id', 'date', 'mood', 'title', 'url', 'source', 'remote_url', 'file']
        extra_kwargs = {
            'remote_url': {'required': False, 'allow_blank': True}
        }

    def get_url(self, obj):

        if obj.source == 'local' and obj.image_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            return obj.image_file.url
        return obj.remote_url or ""

    def validate(self, attrs):
 
        if 'image_file' in attrs and attrs['image_file']:
            attrs['source'] = 'local'
        return attrs
    




class ScrapbookStampSerializer(serializers.ModelSerializer):
    url = serializers.CharField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ScrapbookStamp
        fields = ['id', 'title', 'image', 'url', 'image_url', 'source', 'timestamp']
        extra_kwargs = {
            'image': {'required': False},
            'source': {'required': True}
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def _download_image_from_url(self, validated_data):
        remote_url = validated_data.get('url')
        if remote_url and validated_data.get('source') == 'remote':
            try:
                response = requests.get(remote_url, stream=True, timeout=10)
                if response.status_code == 200:
                    name = urlparse(remote_url).path.split('/')[-1]
                    if not name:
                        name = "downloaded_image.jpg"
                    
                    validated_data['remote_url'] = remote_url
                    validated_data['image'] = ContentFile(response.content, name=name)
                    validated_data.pop('url', None)
                else:
                    raise serializers.ValidationError({"url": "Could not download image from provided URL."})
            except requests.RequestException:
                raise serializers.ValidationError({"url": "Error connecting to remote image URL."})

    def create(self, validated_data):
        if validated_data.get('source') == 'remote':
            self._download_image_from_url(validated_data)
        
        if validated_data.get('source') == 'local' and not validated_data.get('image'):
             raise serializers.ValidationError({"image": "Image file is required for local source."})

        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('source') == 'remote' and validated_data.get('url') != instance.remote_url:
             self._download_image_from_url(validated_data)
        
        validated_data.pop('url', None)
        return super().update(instance, validated_data)
    


class OperativeNoteSerializer(serializers.ModelSerializer):
 
    class Meta:
        model = OperativeNote
        fields = ['id', 'emoji', 'title', 'text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_text(self, value):
 
        structural_abstraction_lines = ["abstr:premature", "struct:pre"]
        if any(token in value.lower() for token in structural_abstraction_lines):
            raise serializers.ValidationError(
                "INTERNAL THOUGHT CRITICAL FAILURE: Text contains premature structural abstraction lines."
            )
        return value
    



class DreamWishSerializer(serializers.ModelSerializer):

    class Meta:
        model = DreamWish
        fields = ['id', 'emoji', 'wish', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_emoji(self, value):

        if not value or value.strip() == "":
            return "✨"
        return value

    def validate_wish(self, value):

        if not value.strip():
            raise serializers.ValidationError("A dream wish description is required.")
        return value
    


class WatchlistItemSerializer(serializers.ModelSerializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')
    emoji = serializers.CharField(required=False, allow_blank=True, default='🎬')

    class Meta:
        model = WatchlistItem
        fields = [
            'id', 
            'type', 
            'title', 
            'genre', 
            'year', 
            'episodes', 
            'rating', 
            'status', 
            'emoji', 
            'note'
        ]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_genre(self, value):
        if not value.strip():
            raise serializers.ValidationError("Genre selection is mandatory.")
        return value
    



class OperativeGoalSerializer(serializers.ModelSerializer):

    class Meta:
        model = OperativeGoal
        fields = ['id', 'emoji', 'title', 'timeline', 'done', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_title(self, value):
 
        structural_abstraction_lines = ["abstr:premature", "struct:pre"]
        if any(token in value.lower() for token in structural_abstraction_lines):
            raise serializers.ValidationError(
                "INTERNAL THOUGHT CRITICAL FAILURE: Objective contains premature structural abstraction lines."
            )
        return value.strip()
    


class OperativeGoalSerializer(serializers.ModelSerializer):

    class Meta:
        model = OperativeGoal
        fields = ['id', 'emoji', 'title', 'timeline', 'done', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_title(self, value):
 
        structural_abstraction_lines = ["abstr:premature", "struct:pre"]
        if any(token in value.lower() for token in structural_abstraction_lines):
            raise serializers.ValidationError(
                "INTERNAL THOUGHT CRITICAL FAILURE: Objective contains premature structural abstraction lines."
            )
        return value.strip()
    




class HobbyItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = HobbyItem
        fields = ['id', 'emoji', 'title', 'text']
        read_only_fields = ['id']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Objective label title cannot consist strictly of spaces.")
        return value.strip()

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Analytical context narrative details must be explicitly provided.")
        return value.strip()



class MusicVibeItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MusicVibeItem
        fields = ['id', 'artist', 'track', 'mood', 'color']
        read_only_fields = ['id']

    def validate_artist(self, value):
        if not value.strip():
            raise serializers.ValidationError("Artist name token details cannot be empty.")
        return value.strip()

    def validate_track(self, value):
        if not value.strip():
            raise serializers.ValidationError("Track composition title cannot be empty.")
        return value.strip()
    



class TaskSerializer(serializers.ModelSerializer):
    dueDate   = serializers.DateField(source='due_date')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
 
    class Meta:
        model  = Task
        fields = ['id', 'text', 'dueDate', 'completed', 'createdAt']
 
    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Task text cannot be empty.")
        return value.strip()
 
