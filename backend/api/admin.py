from django.contrib import admin
from .models import (
    ProfessionalDevelopment, Project, AboutMe, DayLog, 
    ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, 
    OperativeGoal, HobbyItem, MusicVibeItem, Task
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
    list_display = ('name', 'email', 'phone', 'base_secret_code', 'clearance_level', 'created_at')
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
    list_display = ('title', 'type', 'genre', 'year', 'episodes', 'rating', 'status', 'created_at')
    list_filter = ('type', 'status', 'genre')
    search_fields = ('title',)

@admin.register(OperativeGoal)
class OperativeGoalAdmin(admin.ModelAdmin):
    list_display = ('emoji', 'title', 'timeline', 'done', 'created_at', 'updated_at')
    list_filter = ('done',)
    search_fields = ('title',)

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

