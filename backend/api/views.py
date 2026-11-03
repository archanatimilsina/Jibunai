from django.db import connection
from django.db.models import F, Q, Count, Sum
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from .models import Challenge, ChallengeDay, PDFDocument, ProfessionalDevelopment, Project, AboutMe, DayLog, OperativeGoal, GoalDayStatus, ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, HobbyItem, MusicVibeItem, Task, BlogCategory, BlogPost, BlogComment
from .models import verify_secret, is_password_hashed
from .serializers import ChallengeSerializer,PDFDocumentSerializer, InstantStatusSerializer, ProfessionalDevelopmentSerializer, ProjectSerializer, DreamWishSerializer, HobbyItemSerializer, MusicVibeItemSerializer, TaskSerializer, AboutMeSerializer, DayLogSerializer, OperativeNoteSerializer, ScrapbookStampSerializer, DreamWishSerializer, WatchlistItemSerializer, OperativeGoalSerializer, BlogCategorySerializer, BlogPostListSerializer, BlogPostDetailSerializer, BlogCommentSerializer, BlogImageUploadSerializer
from django.core.files.storage import default_storage
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import FileResponse, HttpResponse, Http404
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny
import hmac
import re
from io import BytesIO
from .authentication import (
    PREAUTH_SALT, GATE2_SALT, AUTH_SALT,
    PREAUTH_MAX_AGE, GATE2_MAX_AGE, AUTH_MAX_AGE,
)


class HealthView(APIView):

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False

        return Response(
            {"status": "ok" if db_ok else "degraded", "db": db_ok},
            status=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class projectListView(generics.ListCreateAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class ProfessionalDevelopmentListView(generics.ListCreateAPIView):
    queryset = ProfessionalDevelopment.objects.all()
    serializer_class = ProfessionalDevelopmentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]  

class ProfessionalDevelopmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProfessionalDevelopment.objects.all()
    serializer_class = ProfessionalDevelopmentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser] 

class AboutMeListCreateView(generics.ListCreateAPIView):
    queryset = AboutMe.objects.all()
    serializer_class = AboutMeSerializer

class AboutMeRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AboutMe.objects.all()
    serializer_class = AboutMeSerializer

class DayLogListCreateView(generics.ListCreateAPIView):
    queryset = DayLog.objects.all()
    serializer_class = DayLogSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

class DayLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DayLog.objects.all()
    serializer_class = DayLogSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class ScrapbookArchiveAPIView(generics.ListCreateAPIView):
    queryset = ScrapbookStamp.objects.all()
    serializer_class = ScrapbookStampSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

class ScrapbookStampDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ScrapbookStamp.objects.all()
    serializer_class = ScrapbookStampSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

class NoteListCreateAPIView(generics.ListCreateAPIView):
    queryset = OperativeNote.objects.all()
    serializer_class = OperativeNoteSerializer

class NoteRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OperativeNote.objects.all()
    serializer_class = OperativeNoteSerializer


class DreamWishListCreateAPIView(generics.ListCreateAPIView):
    queryset = DreamWish.objects.all() 
    serializer_class = DreamWishSerializer


class DreamWishDetailAPIView(generics.RetrieveUpdateDestroyAPIView):

    queryset = DreamWish.objects.all()
    serializer_class = DreamWishSerializer

class WatchlistItemListCreateAPIView(generics.ListCreateAPIView):
    queryset = WatchlistItem.objects.all()
    serializer_class = WatchlistItemSerializer
 
 
class WatchlistItemRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WatchlistItem.objects.all()
    serializer_class = WatchlistItemSerializer
 

class GoalListCreateAPIView(generics.ListCreateAPIView):
    queryset = OperativeGoal.objects.prefetch_related('day_statuses').all()
    serializer_class = OperativeGoalSerializer


class GoalRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OperativeGoal.objects.prefetch_related('day_statuses').all()
    serializer_class = OperativeGoalSerializer


class GoalDayToggleAPIView(APIView):
    def patch(self, request, pk, day_number):
        goal = get_object_or_404(OperativeGoal, pk=pk)
        day_status = get_object_or_404(
            GoalDayStatus, goal=goal, day_number=day_number
        )

        day_status.done = not day_status.done
        day_status.save()

        goal.sync_done_status()

        serializer = OperativeGoalSerializer(goal)
        return Response(serializer.data, status=status.HTTP_200_OK)

class HobbyListCreateAPIView(generics.ListCreateAPIView):
    queryset = HobbyItem.objects.all()
    serializer_class = HobbyItemSerializer


class HobbyRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = HobbyItem.objects.all()
    serializer_class = HobbyItemSerializer


class MusicVibeListCreateAPIView(generics.ListCreateAPIView):
    queryset = MusicVibeItem.objects.all()
    serializer_class = MusicVibeItemSerializer


class MusicVibeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MusicVibeItem.objects.all()
    serializer_class = MusicVibeItemSerializer


class TaskListCreateAPIView(generics.ListCreateAPIView):
    queryset         = Task.objects.all()
    serializer_class = TaskSerializer
 
class TaskRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Task.objects.all()
    serializer_class = TaskSerializer
 

class VerifySecretView(APIView):
    # Pre-auth oracle by design (web lock screen + old clients call this
    # before login). Brute force is blunted by the `verify` throttle +
    # hashed comparison; the gate credential itself is never returned.
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify'

    def post(self, request):
        field = request.data.get('field')
        value = request.data.get('value', '')

        record = AboutMe.objects.first()
        if not record:
            return Response({'allowed': False})

        if field == 'gate':
            allowed = verify_secret(record.base_secret_code, str(value))
            if allowed and not is_password_hashed(record.base_secret_code):
                # Transparent upgrade: re-hash the legacy plaintext secret.
                # Guarded: pre-migration columns are too narrow for hashes.
                try:
                    record.base_secret_code = str(value)
                    record.save(update_fields=['base_secret_code'])
                except Exception:
                    pass
        elif field == 'sidebar':
            allowed = hmac.compare_digest(str(value), record.sidebar_code or '')
        elif field == 'dream':
            allowed = hmac.compare_digest(str(value).strip().lower(), (record.portal_dream or '').strip().lower())
        else:
            allowed = False

        return Response({'allowed': allowed})


class SecretMetaView(APIView):

    # Same pre-auth rationale as VerifySecretView: lengths only, no secrets.
    authentication_classes = []
    permission_classes = [AllowAny]

    MAX_LEN = 12

    def get(self, request):
        record = AboutMe.objects.first()
        if not record:
            return Response({'gate_length': 4, 'sidebar_length': 4})

        def length(value, default=4):
            n = len(value or '')
            return n if 1 <= n <= self.MAX_LEN else default

        return Response({
            'gate_length':    length(record.base_secret_code),
            'sidebar_length': length(record.sidebar_code),
        })


# ---------------------------------------------------------------------------
# Compat auth shim for the mobile 3-gate flow (POST /api/auth/...).
# Single-owner app: the first AboutMe row is the account. Tokens are signed
# (stateless) — no new model/migration. Mirrors src/api/auth.js + validation.js.
# Salts/ages live in .authentication (imported above) to avoid a cycle.
# ---------------------------------------------------------------------------


def _auth_record():
    return AboutMe.objects.first()


def _auth_user_payload(record, username):
    return {'name': record.name, 'username': username}


class AuthRegisterView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        full_name = str(request.data.get('full_name') or '').strip()
        username = str(request.data.get('username') or '').strip()
        date_of_birth = str(request.data.get('date_of_birth') or '').strip()
        dream = str(request.data.get('dream') or '').strip()
        secret_code = request.data.get('secret_code')
        secret_code = '' if secret_code is None else str(secret_code)

        if not full_name:
            return Response({'detail': 'Full name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(username) < 3:
            return Response({'detail': 'Username must be at least 3 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if not date_of_birth:
            return Response({'detail': 'Date of birth is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not dream:
            return Response({'detail': 'Dream is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not secret_code.strip() or not (4 <= len(secret_code) <= 8):
            return Response(
                {'detail': 'Secret code must be between 4 and 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record = _auth_record()
        if record is None:
            record = AboutMe(
                name=full_name,
                email=f'{username}@jibunai.local',
                portal_dream=dream,
                base_secret_code=secret_code,
            )
            record.save()
        else:
            record.name = full_name
            record.portal_dream = dream
            record.base_secret_code = secret_code
            record.save(update_fields=['name', 'portal_dream', 'base_secret_code'])

        return Response(
            {'name': record.name, 'username': username, 'dream': dream},
            status=status.HTTP_201_CREATED,
        )


class AuthGate1View(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        username = str(request.data.get('username') or '').strip()
        if not username:
            return Response({'detail': 'Name / username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if _auth_record() is None:
            return Response({'detail': 'No account yet. Please register first.'}, status=status.HTTP_404_NOT_FOUND)
        token = TimestampSigner(salt=PREAUTH_SALT).sign(f'gate1:{username}')
        return Response({'preauth_token': token})


class AuthGate2View(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify'

    def post(self, request):
        preauth = request.data.get('preauth_token') or ''
        dream = str(request.data.get('dream') or '').strip()
        if not dream:
            return Response({'detail': 'Dream is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            unsigned = TimestampSigner(salt=PREAUTH_SALT).unsign(preauth, max_age=PREAUTH_MAX_AGE)
        except (BadSignature, SignatureExpired):
            return Response(
                {'detail': 'Session expired. Start again from Gate 1.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        username = unsigned.partition(':')[2] or unsigned
        record = _auth_record()
        if record is None or not hmac.compare_digest((record.portal_dream or '').strip().lower(), dream.lower()):
            return Response({'detail': 'Dream does not match our records.'}, status=status.HTTP_400_BAD_REQUEST)
        token = TimestampSigner(salt=GATE2_SALT).sign(f'gate2:{username}')
        return Response({'preauth_token': token, 'ok': True})


class AuthGate3View(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify'

    def post(self, request):
        preauth = request.data.get('preauth_token') or ''
        secret_code = request.data.get('secret_code')
        secret_code = '' if secret_code is None else str(secret_code)
        try:
            unsigned = TimestampSigner(salt=GATE2_SALT).unsign(preauth, max_age=GATE2_MAX_AGE)
        except (BadSignature, SignatureExpired):
            return Response(
                {'detail': 'Session expired. Start again from Gate 1.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        username = unsigned.partition(':')[2] or unsigned
        record = _auth_record()
        if record is None or not verify_secret(record.base_secret_code, secret_code):
            return Response({'detail': 'Invalid secret code. Try again.'}, status=status.HTTP_400_BAD_REQUEST)
        if not is_password_hashed(record.base_secret_code or ''):
            # Transparent upgrade: re-hash the legacy plaintext secret.
            # Guarded: pre-migration columns are too narrow for hashes.
            try:
                record.base_secret_code = secret_code
                record.save(update_fields=['base_secret_code'])
            except Exception:
                pass
        auth_token = TimestampSigner(salt=AUTH_SALT).sign(f'auth:{username}')
        return Response({'auth_token': auth_token, 'user': _auth_user_payload(record, username)})


class AuthLogoutView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Stateless signed tokens: nothing to revoke server-side.
        return Response({'ok': True})


class AuthMeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        raw = request.META.get('HTTP_AUTHORIZATION', '')
        token = raw[7:] if raw.startswith('Bearer ') else (request.query_params.get('token') or '')
        if not token:
            return Response({'detail': 'Missing auth token.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            unsigned = TimestampSigner(salt=AUTH_SALT).unsign(token, max_age=AUTH_MAX_AGE)
        except (BadSignature, SignatureExpired):
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)
        username = unsigned.partition(':')[2] or unsigned
        record = _auth_record()
        if record is None:
            return Response({'detail': 'No account found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_auth_user_payload(record, username))

class ChallengeListCreateAPIView(generics.ListCreateAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer


class ChallengeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer


class ChallengeMarkDayAPIView(APIView):
    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)

        if challenge.type != Challenge.ChallengeType.DAYS:
            return Response(
                {'detail': 'Only days challenges have daily marking.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        if not challenge.is_today_editable():
            return Response(
                {'detail': 'This challenge has no editable day today.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        day = challenge.days.filter(date=today).first()
        if day:
            day.delete()
            completed = False
        else:
            ChallengeDay.objects.create(challenge=challenge, date=today)
            completed = True

        return Response(
            {'date': today, 'completed': completed, 'stats': challenge.get_stats()},
            status=status.HTTP_200_OK,
        )


class ChallengeInstantStatusAPIView(APIView):
    def patch(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)

        if challenge.type != Challenge.ChallengeType.INSTANT:
            return Response(
                {'detail': 'Only instant challenges have a status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InstantStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        challenge.instant_status = serializer.validated_data['instant_status']
        challenge.save(update_fields=['instant_status'])

        return Response(ChallengeSerializer(challenge).data)


def _storage_bytes(file_field):
    storage = file_field.storage
    client = getattr(storage, 'client', None)
    bucket = getattr(storage, 'bucket_name', None)
    if client is not None and bucket:
        return bytes(client.storage.from_(bucket).download(file_field.name))
    # Local / default storage fallback (never 500 on missing attrs).
    file_field.open('rb')
    try:
        return file_field.read()
    finally:
        file_field.close()


def _safe_filename(name, default='file'):
    base = (name or default).split('/')[-1].split('\\')[-1]
    base = re.sub(r'[^A-Za-z0-9._-]', '_', base).strip('._') or default
    return base[:100]


class PDFListCreateView(generics.ListCreateAPIView):
    queryset = PDFDocument.objects.all()
    serializer_class = PDFDocumentSerializer

    def get_serializer_context(self):
        return {"request": self.request}


class PDFDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PDFDocument.objects.all()
    serializer_class = PDFDocumentSerializer
    lookup_field = "id"

    def get_serializer_context(self):
        return {"request": self.request}


class PDFDownloadView(APIView):
    def get(self, request, id):
        doc = get_object_or_404(PDFDocument, id=id)

        try:
            data = _storage_bytes(doc.file)
        except Exception:
            raise Http404("File not found in storage.")

        filename = _safe_filename(getattr(doc.file, 'name', 'document.pdf'), default='document.pdf')
        if not filename.lower().endswith('.pdf'):
            filename += '.pdf'
        # FileResponse streams instead of buffering the whole file in memory.
        return FileResponse(
            BytesIO(bytes(data)),
            content_type='application/pdf',
            filename=filename,
            as_attachment=True,
        )


class BlogCategoryListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = BlogCategorySerializer

    def get_queryset(self):
        return BlogCategory.objects.annotate(post_count=Count('posts'))


class BlogImageUploadAPIView(APIView):

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = BlogImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data['image']

        name = default_storage.save(upload.name, upload)
        return Response(
            {'url': default_storage.url(name), 'name': name},
            status=status.HTTP_201_CREATED,
        )


class BlogCategoryRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BlogCategorySerializer

    def get_queryset(self):
        return BlogCategory.objects.annotate(post_count=Count('posts'))


class BlogPostPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 48


class BlogPostListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = BlogPostListSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = BlogPostPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BlogPostDetailSerializer
        return BlogPostListSerializer

    def get_queryset(self):
        qs = BlogPost.objects.select_related('category').annotate(comment_count=Count('comments'))
        params = self.request.query_params

        status_param = params.get('status')
        if status_param in ('draft', 'published'):
            qs = qs.filter(status=status_param)

        category = params.get('category')
        if category:
            if str(category).isdigit():
                qs = qs.filter(category_id=category)
            else:
                qs = qs.filter(category__slug=category)

        tag = params.get('tag')
        if tag:
            # tags is a JSON list — contains, not icontains (which 500s on Postgres).
            qs = qs.filter(tags__contains=[tag])

        featured = params.get('featured')
        if featured in ('true', '1'):
            qs = qs.filter(is_featured=True)

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(excerpt__icontains=search)
                | Q(content__icontains=search)
                | Q(tags__contains=[search])
            )

        ordering = params.get('ordering')
        allowed = {
            'newest': '-created_at',
            'oldest': 'created_at',
            'popular': '-views',
            'liked': '-likes',
            'title': 'title',
        }
        if ordering in allowed:
            qs = qs.order_by(allowed[ordering])
        else:
            qs = qs.order_by('-is_featured', '-published_at', '-created_at')

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        output = BlogPostDetailSerializer(post, context={'request': request})
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


class BlogPostStatsAPIView(APIView):

    def get(self, request):
        agg = BlogPost.objects.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(status='published')),
            drafts=Count('id', filter=Q(status='draft')),
            views=Sum('views'),
            likes=Sum('likes'),
        )
        return Response({
            'total': agg['total'] or 0,
            'published': agg['published'] or 0,
            'drafts': agg['drafts'] or 0,
            'views': agg['views'] or 0,
            'likes': agg['likes'] or 0,
        })


class BlogPostRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BlogPostListSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return (
            BlogPost.objects.select_related('category')
            .prefetch_related('comments')
            .annotate(comment_count=Count('comments'))
        )

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return BlogPostDetailSerializer
        return BlogPostListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        output = BlogPostDetailSerializer(instance, context={'request': request})
        return Response(output.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        output = BlogPostDetailSerializer(post, context={'request': request})
        return Response(output.data)


class BlogPostLikeAPIView(APIView):

    def post(self, request, pk):
        post = get_object_or_404(BlogPost, pk=pk)
        liked = request.data.get('like', True)
        liked = str(liked).lower() not in ('false', '0', 'no')

        if liked:
            BlogPost.objects.filter(pk=pk).update(likes=F('likes') + 1)
        else:
            BlogPost.objects.filter(pk=pk, likes__gt=0).update(likes=F('likes') - 1)

        post.refresh_from_db(fields=['likes'])
        return Response({'id': post.id, 'likes': post.likes})


class BlogPostViewAPIView(APIView):

    def post(self, request, pk):
        get_object_or_404(BlogPost, pk=pk)
        BlogPost.objects.filter(pk=pk).update(views=F('views') + 1)
        post = BlogPost.objects.only('id', 'views').get(pk=pk)
        return Response({'id': post.id, 'views': post.views})


class BlogCommentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = BlogCommentSerializer

    def get_queryset(self):
        qs = BlogComment.objects.select_related('post').all()
        post = self.request.query_params.get('post')
        if post:
            qs = qs.filter(post_id=post)
        return qs


class BlogCommentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BlogComment.objects.all()
    serializer_class = BlogCommentSerializer
