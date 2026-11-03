from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ProfessionalDevelopment, Project, AboutMe, DayLog, 
    ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, 
    OperativeGoal,GoalDayStatus, HobbyItem, MusicVibeItem, Task,PDFDocument,
    BlogCategory, BlogPost, BlogComment,
)


@admin.register(ProfessionalDevelopment)
class ProfessionalDevelopmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'company', 'duration', 'certificate_image')
    list_filter = ('name', 'company')
    search_fields = ('subject', 'company')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'project_type', 'tech', 'github_link', 'created_at')
    list_filter = ('project_type', 'created_at')
    search_fields = ('name', 'tech')

@admin.register(AboutMe)
class AboutMeAdmin(admin.ModelAdmin):
    # Never show the gate credential in the changelist.
    list_display = ('name', 'email', 'phone', 'created_at')
    search_fields = ('name', 'email')
@admin.register(DayLog)
class DayLogAdmin(admin.ModelAdmin):
    list_display = ('date', 'title', 'mood', 'source', 'created_at')
    list_filter = ('mood', 'source', 'date')
    search_fields = ('title',)

@admin.register(ScrapbookStamp)
class ScrapbookStampAdmin(admin.ModelAdmin):
    list_display = ('title', 'source', 'timestamp')
    list_filter = ('source', 'timestamp')
    search_fields = ('title',)

@admin.register(OperativeNote)
class OperativeNoteAdmin(admin.ModelAdmin):
    list_display = ('emoji', 'title', 'created_at', 'updated_at')
    search_fields = ('title', 'text')

@admin.register(DreamWish)
class DreamWishAdmin(admin.ModelAdmin):
    list_display = ('emoji', 'wish', 'created_at', 'updated_at')
    search_fields = ('wish',)

@admin.register(WatchlistItem)
class WatchlistItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'genre', 'status', 'created_at')
    list_filter = ('type', 'status', 'genre')
    search_fields = ('title',)
 

class GoalDayStatusInline(admin.TabularInline):
    model = GoalDayStatus
    extra = 0
    readonly_fields = ('day_number', 'updated_at')
    can_delete = False
    fields = ('day_number', 'done', 'updated_at')


@admin.register(OperativeGoal)
class OperativeGoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'timeline', 'done', 'progress_display', 'created_at', 'updated_at')
    list_filter = ('done',)
    search_fields = ('title',)
    inlines = [GoalDayStatusInline]

    def progress_display(self, obj):
        return f"{obj.days_completed}/{obj.timeline}"
    progress_display.short_description = "Progress"

@admin.register(HobbyItem)
class HobbyItemAdmin(admin.ModelAdmin):
    list_display = ('emoji', 'title', 'created_at', 'updated_at')
    search_fields = ('title',)

@admin.register(MusicVibeItem)
class MusicVibeItemAdmin(admin.ModelAdmin):
    list_display = ('artist', 'track', 'mood', 'color', 'created_at')
    search_fields = ('artist', 'track', 'mood')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('text', 'due_date', 'completed', 'created_at','updated_at')


@admin.register(PDFDocument)
class PDFDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "size", "uploaded_at", "updated_at")
    search_fields = ("title",)
    readonly_fields = ("size", "uploaded_at", "updated_at")


@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'color', 'post_count', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at',)

    @admin.display(description='Posts')
    def post_count(self, obj):
        return obj.posts.count()


class BlogCommentInline(admin.TabularInline):
    model = BlogComment
    extra = 0
    fields = ('author_name', 'body', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'status', 'is_featured', 'category', 'author',
        'read_time', 'views', 'likes', 'comment_count', 'published_at',
    )
    list_filter = ('status', 'is_featured', 'category', 'created_at')
    search_fields = ('title', 'excerpt', 'content', 'tags')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('status', 'is_featured', 'category')
    date_hierarchy = 'created_at'
    inlines = [BlogCommentInline]
    readonly_fields = ('read_time', 'views', 'likes', 'published_at', 'created_at', 'updated_at', 'cover_preview')
    actions = ('make_published', 'make_draft', 'feature', 'unfeature')
    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'author', 'excerpt', 'content', 'tags')
        }),
        ('Media', {
            'fields': ('cover_image', 'cover_preview')
        }),
        ('Organisation', {
            'fields': ('category', 'status', 'is_featured')
        }),
        ('Metrics', {
            'fields': ('read_time', 'views', 'likes', 'published_at', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Comments')
    def comment_count(self, obj):
        return obj.comments.count()

    @admin.display(description='Cover preview')
    def cover_preview(self, obj):
        if obj and obj.cover_image:
            return format_html('<img src="{}" style="max-height:180px;border-radius:8px;" />', obj.cover_image.url)
        return '—'

    @admin.action(description='Publish selected posts')
    def make_published(self, request, queryset):
        updated = queryset.update(status=BlogPost.Status.PUBLISHED)
        self.message_user(request, f'{updated} post(s) published.')

    @admin.action(description='Move selected posts to draft')
    def make_draft(self, request, queryset):
        updated = queryset.update(status=BlogPost.Status.DRAFT)
        self.message_user(request, f'{updated} post(s) moved to draft.')

    @admin.action(description='Feature selected posts')
    def feature(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} post(s) featured.')

    @admin.action(description='Unfeature selected posts')
    def unfeature(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} post(s) unfeatured.')


@admin.register(BlogComment)
class BlogCommentAdmin(admin.ModelAdmin):
    list_display = ('author_name', 'post', 'short_body', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('author_name', 'body', 'post__title')
    readonly_fields = ('created_at',)

    @admin.display(description='Comment')
    def short_body(self, obj):
        return (obj.body[:60] + '…') if len(obj.body) > 60 else obj.body
