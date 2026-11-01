from django.db import models
import os
import uuid
from django.core.validators import RegexValidator
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
import uuid
from django.core.exceptions import ValidationError
from django.db import models
from datetime import timedelta
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.text import slugify


class ProfessionalDevelopment(models.Model):
    DEVELOPMENT_TYPES = [
        ('Mentorship', 'Mentorship'),
        ('Internship', 'Internship'),
        ('Course', 'Course'),
        ('Fellowship', 'Fellowship'),
        ('Session', 'Session'),
        ('Online Course', 'Online Course'),
    ]
    
    name = models.CharField(
        max_length=50, 
        choices=DEVELOPMENT_TYPES,
    )
    
    subject = models.CharField(
        max_length=200,
    )
    company = models.CharField(
        max_length=100,
    )
    duration = models.CharField(
        max_length=100,  
    )
    certificate_image = models.ImageField(
    upload_to='certificates/',
    blank=True,
    null=True,
)
    
    learnings = models.JSONField(
        default=list,
        blank=True,
   )
    skills_acquired = models.JSONField(
        default=list,
        blank=True,
    )
    
    class Meta:
        verbose_name = "Professional Development"

    def __str__(self):
        return f"{self.name} in {self.subject} at {self.company}"
    

class Project(models.Model):
    PROJECT_TYPES = [
        ('solo', 'Solo'),
        ('group', 'Group'),
        ('academic', 'Academic'),
        ('open_source', 'Open Source'),
    ]

    name = models.CharField(
        max_length=100, 
        unique=True,
    )
    tech = models.CharField(
        max_length=150,
    )
    project_type = models.CharField(
        max_length=50,
        choices=PROJECT_TYPES,
        default='solo',
    )
    description = models.TextField(
        blank=True, 
        null=True,
    )
    tech_stack = models.JSONField(
        default=dict,
        blank=True,
    )
    features = models.JSONField(
        default=list,
        blank=True,
    )
    github_link = models.URLField(
        max_length=500,
        blank=True,
        null=True,
    )
    live_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ['created_at']  

    def __str__(self):
        return self.name
    

class AboutMe(models.Model):
    name = models.CharField(
        max_length=255, 
    )
    email = models.EmailField(
        unique=True, 
    )
    phone = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
    )
    address = models.TextField(
        blank=True, 
        null=True, 
    )
    base_secret_code = models.CharField(
        max_length=4, 
    )
    sidebar_code = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
    )
    portal_dream = models.TextField(
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name}"
    
class DayLog(models.Model):
    MOOD_CHOICES = [
        ('Happy', 'Happy'),
        ('Fine', 'Fine'),
        ('Neutral', 'Neutral'),
        ('Sad', 'Sad'),
        ('Worse', 'Worse'),
        ('Tired', 'Tired'),
        ('Wooow', 'Wooow'),
    ]
    SOURCE_CHOICES = [
        ('local', 'Local'),
        ('remote', 'Remote'),
    ]
    date = models.DateField(
    )
    mood = models.CharField(
        max_length=15, 
        choices=MOOD_CHOICES, 
        default='Neutral',
    )
    title = models.CharField(
        max_length=255,
    )
    
    image_file = models.ImageField(
        upload_to='scrapbook/days/', 
        blank=True, 
        null=True,
    )
    remote_url = models.URLField(
        max_length=1000, 
        blank=True, 
        null=True,
    )
    source = models.CharField(
        max_length=10, 
        choices=SOURCE_CHOICES, 
        default='remote',
  
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"[{self.date}] {self.title[:30]} ({self.mood})"
    

def scrapbook_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('scrapbook', filename)


class ScrapbookStamp(models.Model):
    SOURCE_CHOICES = [
        ('local', 'Local Upload'),
        ('remote', 'Remote URL'),
    ]

    title = models.CharField(max_length=255, verbose_name="Memory Label")
    image = models.ImageField(
        upload_to=scrapbook_upload_path, 
    )
    remote_url = models.URLField(max_length=1000, blank=True, null=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='local')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return self.title


@receiver(post_delete, sender=ScrapbookStamp)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class OperativeNote(models.Model):
    emoji = models.CharField(
        max_length=10, 
        default="📝", 
        blank=True,
    )
    
    title = models.CharField(
        max_length=255, 
    )
    
    text = models.TextField(
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True, 
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ['-created_at'] 

    def __str__(self):
        return f"{self.emoji} {self.title} (Inserted: {self.created_at.date()})"
    

class DreamWish(models.Model):
    emoji = models.CharField(
        max_length=10, 
        default="✨", 
        blank=True,
    )

    wish = models.TextField(
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        truncated_wish = (self.wish[:50] + '..') if len(self.wish) > 50 else self.wish
        return f"{self.emoji} - {truncated_wish}"
    

class WatchlistItem(models.Model):
    TYPE_CHOICES = [
        ('drama', 'Drama'),
        ('movie', 'Movie'),
        ('anime', 'Anime'),
        ('book', 'Book'),
        ('manga', 'Manga'),
    ]

    STATUS_CHOICES = [
        ('Watching', 'Watching'),
        ('Completed', 'Completed'),
        ('Plan to Watch', 'Plan to Watch'),
        ('On Hold', 'On Hold'),
        ('Dropped', 'Dropped'),
        ('Faded', 'faded'),
    ]

    GENRE_CHOICES = [
        ('BL', 'BL'),
        ('Bromance', 'bromance'),
        ('Detective', 'detective'),
        ('Historical', 'historical'),
        ('Thriller', 'Thriller'),
        ('Romance', 'Romance'),
        ('Action', 'Action'),
        ('Drama', 'Drama'),
        ('Fantasy', 'Fantasy'),
        ('Horror', 'Horror'),
        ('Sci-Fi', 'Sci-Fi'),
        ('Comedy', 'Comedy'),
        ('Crime', 'crime'),
        ('Adventure', 'adventure'),
        ('Sad', 'sad'),
    ]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='drama')
    title = models.CharField(max_length=255)
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Plan to Watch')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.type})"


class OperativeGoal(models.Model):
    title = models.CharField(max_length=255)
    timeline = models.PositiveIntegerField()
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['done', '-created_at']

    def __str__(self):
        status = "✓" if self.done else "×"
        return f"[{status}] {self.title} (Inserted: {self.created_at.date()})"

    @property
    def days_completed(self):
        return self.day_statuses.filter(done=True).count()

    def sync_day_statuses(self):
        existing_days = set(
            self.day_statuses.values_list('day_number', flat=True)
        )
        target_days = set(range(1, self.timeline + 1))

        to_add = target_days - existing_days
        to_remove = existing_days - target_days

        if to_add:
            GoalDayStatus.objects.bulk_create([
                GoalDayStatus(goal=self, day_number=d) for d in to_add
            ])
        if to_remove:
            self.day_statuses.filter(day_number__in=to_remove).delete()

    def sync_done_status(self):
        completed = self.days_completed
        new_done = self.timeline > 0 and completed >= self.timeline
        if new_done != self.done:
            self.done = new_done
            self.save(update_fields=['done'])

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            GoalDayStatus.objects.bulk_create([
                GoalDayStatus(goal=self, day_number=i)
                for i in range(1, self.timeline + 1)
            ])
        else:
            self.sync_day_statuses()


class GoalDayStatus(models.Model):
    goal = models.ForeignKey(
        OperativeGoal,
        related_name='day_statuses',
        on_delete=models.CASCADE,
    )
    day_number = models.PositiveIntegerField()
    done = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_number']
        unique_together = ('goal', 'day_number')

    def __str__(self):
        return f"{self.goal.title} · Day {self.day_number} · {'done' if self.done else 'not done'}"

class HobbyItem(models.Model):
    emoji = models.CharField(
        max_length=12, 
        default="✨", 
        blank=True,
    )
    
    title = models.CharField(
        max_length=150,
    )
    
    text = models.TextField(
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.emoji} {self.title}"
    

class MusicVibeItem(models.Model):

    artist = models.CharField(
        max_length=150,
    )
    
    track = models.CharField(
        max_length=200,
    )
    
    mood = models.CharField(
        max_length=255,
    )

    color_validator = RegexValidator(
        regex=r'^#(?:[0-9a-fA-F]{3}){1,2}$',
    )
    
    color = models.CharField(
        max_length=7,
        validators=[color_validator],
        default="#10b981",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.artist} - {self.track} ({self.color})"
    

class Task(models.Model):
    text       = models.CharField(max_length=500)
    due_date   = models.DateField()
    completed  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "✓" if self.completed else "○"
        return f"[{status}] {self.text[:60]} ({self.due_date})"

class Challenge(models.Model):
    class ChallengeType(models.TextChoices):
        DAYS = 'days', 'Days'
        INSTANT = 'instant', 'Instant'

    class InstantStatus(models.TextChoices):
        COMPLETED = 'completed', 'Completed'
        NOT_COMPLETED = 'not_completed', 'Not completed'
        PENDING = 'pending', 'Pending'

    class Status(models.TextChoices):
        ONGOING = 'ongoing', 'Ongoing'
        ENDED = 'ended', 'Ended'

    title = models.CharField(max_length=200)
    type = models.CharField(max_length=10, choices=ChallengeType.choices)
    start_date = models.DateField()
    duration_days = models.PositiveIntegerField()
    end_date = models.DateField()

    instant_status = models.CharField(
        max_length=20,
        choices=InstantStatus.choices,
        default=InstantStatus.PENDING,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.get_type_display()})'

    def clean(self):
        if self.type == self.ChallengeType.DAYS and (not self.duration_days or self.duration_days < 1):
            raise ValidationError({'duration_days': 'Must be at least 1 day for a days challenge.'})
        if self.type == self.ChallengeType.INSTANT and self.end_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'End date must be on or after the start date.'})

    def save(self, *args, **kwargs):
        if self.type == self.ChallengeType.DAYS:
            self.end_date = self.start_date + timedelta(days=self.duration_days - 1)
        elif self.type == self.ChallengeType.INSTANT:
            self.duration_days = (self.end_date - self.start_date).days + 1
        super().save(*args, **kwargs)

    def is_today_editable(self):
        today = timezone.localdate()
        return self.type == self.ChallengeType.DAYS and self.start_date <= today <= self.end_date

    @property
    def status(self):
        if self.type != self.ChallengeType.DAYS:
            return None
        today = timezone.localdate()
        return self.Status.ENDED if today > self.end_date else self.Status.ONGOING

    def get_stats(self):
        today = timezone.localdate()
        completed_dates = set(
            self.days.filter(status=ChallengeDay.Status.COMPLETED).values_list('date', flat=True)
        )

        completed = missed = remaining = 0
        longest_streak = running = 0

        all_dates = [self.start_date + timedelta(days=i) for i in range(self.duration_days)]

        for d in all_dates:
            if d in completed_dates:
                completed += 1
                running += 1
                longest_streak = max(longest_streak, running)
            else:
                running = 0
                if d < today:
                    missed += 1
                else:
                    remaining += 1

        current_streak = 0
        past_and_today = [d for d in all_dates if d <= today]
        for d in reversed(past_and_today):
            if d in completed_dates:
                current_streak += 1
            elif d == today:
                continue
            else:
                break

        completion_pct = round((completed / self.duration_days) * 100) if self.duration_days else 0

        return {
            'total_days': self.duration_days,
            'completed': completed,
            'missed': missed,
            'remaining': remaining,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'completion_pct': completion_pct,
            'status': self.status,
        }


class ChallengeDay(models.Model):
    class Status(models.TextChoices):
        COMPLETED = 'completed', 'Completed'

    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='days')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.COMPLETED)
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']
        unique_together = ('challenge', 'date')

    def __str__(self):
        return f'{self.challenge.title} - {self.date}'


def pdf_upload_path(instance, filename):
    return f"pdfs/{instance.id}/{filename}"


def validate_pdf(value):
    if not value.name.lower().endswith(".pdf"):
        raise ValidationError("Only PDF files are allowed.")


class PDFDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=pdf_upload_path, validators=[validate_pdf])
    size = models.PositiveIntegerField(blank=True, null=True, editable=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.file:
            self.size = self.file.size
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        storage, path = self.file.storage, self.file.name
        super().delete(*args, **kwargs)
        if path:
            storage.delete(path)


def blog_cover_upload_path(instance, filename):
    ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
    return os.path.join('blog', 'covers', f"{uuid.uuid4()}.{ext}")


def validate_cover_image(value):
    if not value:
        return
    name = getattr(value, 'name', '').lower()
    allowed = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif')
    if not name.endswith(allowed):
        raise ValidationError("Only image files are allowed (jpg, png, gif, webp, avif).")


class BlogCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=7, default='#2d6a4f')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Blog category'
        verbose_name_plural = 'Blog categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:100] or 'category'
            slug = base
            i = 2
            while BlogCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def post_count(self):
        cached = self.__dict__.get('post_count')
        return cached if cached is not None else self.posts.count()

    @post_count.setter
    def post_count(self, value):
        self.__dict__['post_count'] = value

    def __str__(self):
        return self.name


class BlogPost(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    excerpt = models.TextField(blank=True)
    content = models.TextField(blank=True)
    cover_image = models.ImageField(
        upload_to=blog_cover_upload_path,
        blank=True,
        null=True,
        validators=[validate_cover_image],
    )
    category = models.ForeignKey(
        BlogCategory,
        related_name='posts',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    tags = models.JSONField(default=list, blank=True)
    author = models.CharField(max_length=120, default='Archana Timilsina')
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    is_featured = models.BooleanField(default=False)
    read_time = models.PositiveIntegerField(default=1, editable=False)
    views = models.PositiveIntegerField(default=0, editable=False)
    likes = models.PositiveIntegerField(default=0, editable=False)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', '-published_at', '-created_at']
        verbose_name = 'Blog post'
        verbose_name_plural = 'Blog posts'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    @property
    def comment_count(self):
        cached = self.__dict__.get('comment_count')
        return cached if cached is not None else self.comments.count()

    @comment_count.setter
    def comment_count(self, value):
        self.__dict__['comment_count'] = value

    def _build_unique_slug(self):
        base = slugify(self.title)[:250] or 'post'
        slug = base
        i = 2
        while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            suffix = f"-{i}"
            slug = f"{base[:250 - len(suffix)]}{suffix}"
            i += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_unique_slug()

        words = len((self.content or '').split())
        self.read_time = max(1, round(words / 200)) if words else 1

        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()

        if isinstance(self.tags, list):
            seen, cleaned = set(), []
            for tag in self.tags:
                tag = str(tag).strip()
                if tag and tag.lower() not in seen:
                    seen.add(tag.lower())
                    cleaned.append(tag)
            self.tags = cleaned

        super().save(*args, **kwargs)


class BlogComment(models.Model):
    post = models.ForeignKey(BlogPost, related_name='comments', on_delete=models.CASCADE)
    author_name = models.CharField(max_length=120, default='Anonymous')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Blog comment'
        verbose_name_plural = 'Blog comments'

    def __str__(self):
        return f"{self.author_name}: {self.body[:40]}"


@receiver(post_delete, sender=BlogPost)
def auto_delete_blog_cover(sender, instance, **kwargs):
    if instance.cover_image:
        instance.cover_image.delete(save=False)
