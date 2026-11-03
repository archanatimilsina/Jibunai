from rest_framework import serializers
from .models import Challenge, ChallengeDay,ProfessionalDevelopment, Project, AboutMe, DayLog, Task, ScrapbookStamp,OperativeNote, DreamWish, WatchlistItem, OperativeGoal,  HobbyItem, MusicVibeItem, PDFDocument, BlogCategory, BlogPost, BlogComment
import json
import ipaddress
import requests
import socket
from django.core.files.base import ContentFile
from urllib.parse import urlparse
from datetime import timedelta

# Max bytes we'll pull from a user-supplied image URL (A10 SSRF/DoS guard).
REMOTE_IMAGE_MAX_BYTES = 5 * 1024 * 1024


def _remote_host_is_public(hostname):
    """True only if every resolved IP of hostname is public routable."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    ips = {info[4][0] for info in infos}
    if not ips:
        return False
    for ip in ips:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return False
        if (addr.is_private or addr.is_loopback or addr.is_link_local
                or addr.is_multicast or addr.is_reserved or addr.is_unspecified):
            return False
    return True


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
    # The gate credential is never returned by the API (write-only).
    # sidebarCode/portalDream stay readable: the web profile page displays
    # and edits them (see web/src/ArchanaArea/components/AboutMe.jsx).
    baseSecretCode = serializers.CharField(source='base_secret_code', write_only=True)
    sidebarCode = serializers.CharField(source='sidebar_code', required=False, allow_blank=True)
    portalDream = serializers.CharField(source='portal_dream')
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AboutMe
        fields = [
            'id', 'name', 'address', 'phone', 'email',
            'baseSecretCode', 'sidebarCode', 'portalDream',
            'timestamp'
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
        if not (remote_url and validated_data.get('source') == 'remote'):
            return
        try:
            parsed = urlparse(remote_url)
        except ValueError:
            raise serializers.ValidationError({"url": "Invalid URL."})
        if parsed.scheme not in ('http', 'https') or not parsed.hostname:
            raise serializers.ValidationError({"url": "Only http(s) image URLs are allowed."})
        if not _remote_host_is_public(parsed.hostname):
            raise serializers.ValidationError({"url": "That host is not allowed."})
        try:
            response = requests.get(remote_url, stream=True, timeout=10)
            if response.status_code != 200:
                raise serializers.ValidationError({"url": "Could not download image from provided URL."})
            # Redirects can hop to an internal host — re-check the final URL.
            final = urlparse(response.url or '')
            if final.hostname and final.hostname != parsed.hostname and not _remote_host_is_public(final.hostname):
                raise serializers.ValidationError({"url": "That host is not allowed."})
            ctype = (response.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            if ctype and not ctype.startswith('image/'):
                raise serializers.ValidationError({"url": "URL did not return an image."})
            length = response.headers.get('Content-Length')
            if length and length.isdigit() and int(length) > REMOTE_IMAGE_MAX_BYTES:
                raise serializers.ValidationError({"url": "Image is too large (max 5 MB)."})
            chunks = []
            total = 0
            for chunk in response.iter_content(262144):
                if not chunk:
                    continue
                total += len(chunk)
                if total > REMOTE_IMAGE_MAX_BYTES:
                    raise serializers.ValidationError({"url": "Image is too large (max 5 MB)."})
                chunks.append(chunk)
            data = b''.join(chunks)
        except requests.RequestException:
            raise serializers.ValidationError({"url": "Error connecting to remote image URL."})
        name = (parsed.path.rsplit('/', 1)[-1] or '').strip()[:100] or "downloaded_image.jpg"
        validated_data['remote_url'] = remote_url
        validated_data['image'] = ContentFile(data, name=name)
        validated_data.pop('url', None)

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
    class Meta:
        model = WatchlistItem
        fields = [
            'id',
            'type',
            'title',
            'genre',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_genre(self, value):
        if not value.strip():
            raise serializers.ValidationError("Genre selection is mandatory.")
        return value

from rest_framework import serializers
from .models import OperativeGoal, GoalDayStatus


class GoalDayStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalDayStatus
        fields = ['id', 'day_number', 'done', 'updated_at']
        read_only_fields = ['id', 'day_number', 'updated_at']


class OperativeGoalSerializer(serializers.ModelSerializer):
    day_statuses = GoalDayStatusSerializer(many=True, read_only=True)
    days_completed = serializers.IntegerField(read_only=True)

    class Meta:
        model = OperativeGoal
        fields = [
            'id', 'title', 'timeline', 'done',
            'day_statuses', 'days_completed',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'done', 'created_at', 'updated_at']

    def validate_timeline(self, value):
        if value <= 0:
            raise serializers.ValidationError("Timeline must be a positive number of days.")
        if value > 365:
            raise serializers.ValidationError("Timeline can't exceed 365 days.")
        return value


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
        fields = ['id', 'text', 'dueDate', 'completed', 'createdAt', 'updated_at']
        read_only_fields = ['id', 'createdAt', 'updated_at']
 
    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Task text cannot be empty.")
        return value.strip()


class ChallengeDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallengeDay
        fields = ['id', 'date', 'status', 'marked_at']
        read_only_fields = ['id', 'marked_at']


class ChallengeSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    completed_dates = serializers.SerializerMethodField()
    days = ChallengeDaySerializer(many=True, read_only=True)
    duration_days = serializers.IntegerField(required=False)
    end_date = serializers.DateField(required=False)
    class Meta:
        model = Challenge
        fields = [
            'id',
            'title',
            'type',
            'start_date',
            'duration_days',
            'end_date',
            'instant_status',
            'created_at',
            'stats',
            'completed_dates',
            'days',
        ]
        read_only_fields = ['id', 'created_at', 'days']
    def get_stats(self, obj):
        if obj.type != Challenge.ChallengeType.DAYS:
            return None
        return obj.get_stats()
    def get_completed_dates(self, obj):
        if obj.type != Challenge.ChallengeType.DAYS:
            return []
        return list(
            obj.days.filter(status=ChallengeDay.Status.COMPLETED).values_list('date', flat=True)
        )
    def validate(self, attrs):
        type_ = attrs.get('type', getattr(self.instance, 'type', None))
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        if type_ == Challenge.ChallengeType.DAYS:
            duration = attrs.get('duration_days', getattr(self.instance, 'duration_days', None))
            if not start_date:
                raise serializers.ValidationError(
                    {'start_date': 'Required for a days challenge.'}
                )
            if not duration or duration < 1:
                raise serializers.ValidationError(
                    {'duration_days': 'Required and must be at least 1 for a days challenge.'}
                )
            attrs['duration_days'] = duration
            attrs['end_date'] = start_date + timedelta(days=duration - 1)
        elif type_ == Challenge.ChallengeType.INSTANT:
            end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
            if not start_date:
                raise serializers.ValidationError(
                    {'start_date': 'Required for an instant challenge.'}
                )
            if not end_date:
                raise serializers.ValidationError({'end_date': 'Required for an instant challenge.'})
            if end_date < start_date:
                raise serializers.ValidationError(
                    {'end_date': 'End date must be on or after the start date.'}
                )
            attrs['end_date'] = end_date
            attrs['duration_days'] = (end_date - start_date).days + 1
        return attrs


class InstantStatusSerializer(serializers.Serializer):
    instant_status = serializers.ChoiceField(choices=Challenge.InstantStatus.choices)


class PDFDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    size_kb = serializers.SerializerMethodField()

    class Meta:
        model = PDFDocument
        fields = [
            "id",
            "title",
            "file",
            "file_url",
            "download_url",
            "size",
            "size_kb",
            "uploaded_at",
            "updated_at",
        ]
        read_only_fields = ["id", "size", "uploaded_at", "updated_at"]
        extra_kwargs = {"file": {"write_only": True}}

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_download_url(self, obj):
        request = self.context.get("request")
        if request:
            # reverse() keeps working under a script prefix; no hardcoded /api.
            from django.urls import reverse
            return request.build_absolute_uri(
                reverse("pdf-download", kwargs={"id": obj.id})
            )
        return None

    def get_size_kb(self, obj):
        return round(obj.size / 1024, 2) if obj.size else None

    def validate_file(self, value):
        if not value.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF files are allowed.")
        return value


class TagsField(serializers.Field):

    def to_internal_value(self, data):
        if data is None:
            return []
        if isinstance(data, str):
            raw = data.strip()
            if not raw:
                return []
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(t).strip() for t in parsed if str(t).strip()]
            except (ValueError, TypeError):
                pass
            return [t.strip() for t in raw.split(',') if t.strip()]
        if isinstance(data, (list, tuple)):
            return [str(t).strip() for t in data if str(t).strip()]
        raise serializers.ValidationError("Tags must be a list of strings.")

    def to_representation(self, value):
        return value or []


class BlogImageUploadSerializer(serializers.Serializer):

    image = serializers.ImageField()

    def validate_image(self, value):
        max_bytes = 8 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("Images must be smaller than 8 MB.")
        return value


class BlogCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug', 'description', 'color', 'post_count', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name cannot be empty.")
        return value


class BlogCommentSerializer(serializers.ModelSerializer):
    post_title = serializers.CharField(source='post.title', read_only=True)

    class Meta:
        model = BlogComment
        fields = ['id', 'post', 'post_title', 'author_name', 'body', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment cannot be empty.")
        return value

    def validate_author_name(self, value):
        return (value or '').strip() or 'Anonymous'


class BlogPostListSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_color = serializers.CharField(source='category.color', read_only=True, default=None)
    tags = TagsField(required=False)
    comment_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    remove_cover = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'cover_image', 'cover_image_url',
            'category', 'category_name', 'category_color', 'tags', 'author',
            'status', 'status_display', 'is_featured', 'read_time', 'views',
            'likes', 'comment_count', 'published_at', 'created_at', 'updated_at',
            'remove_cover',
        ]
        read_only_fields = ['id', 'slug', 'read_time', 'views', 'likes', 'published_at', 'created_at', 'updated_at']
        extra_kwargs = {'cover_image': {'write_only': True, 'required': False}}

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("A blog title is required.")
        return value

    def create(self, validated_data):
        validated_data.pop('remove_cover', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove_cover = validated_data.pop('remove_cover', False)
        if remove_cover and instance.cover_image:
            instance.cover_image.delete(save=False)
            instance.cover_image = None
        return super().update(instance, validated_data)


class BlogPostDetailSerializer(BlogPostListSerializer):
    comments = BlogCommentSerializer(many=True, read_only=True)
    word_count = serializers.SerializerMethodField()

    class Meta(BlogPostListSerializer.Meta):
        fields = BlogPostListSerializer.Meta.fields + ['content', 'comments', 'word_count']

    def get_word_count(self, obj):
        return len((obj.content or '').split())
