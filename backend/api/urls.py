from django.urls import path
from .views import TaskRetrieveUpdateDestroyAPIView, TaskListCreateAPIView,  DayLogListCreateView, DayLogDetailView, ScrapbookArchiveAPIView, ScrapbookStampDetailAPIView, NoteListCreateAPIView, NoteRetrieveUpdateDestroyAPIView, DreamWishListCreateAPIView, DreamWishDetailAPIView, WatchlistItemListCreateAPIView, WatchlistItemRetrieveUpdateDestroyAPIView, GoalListCreateAPIView, GoalRetrieveUpdateDestroyAPIView, GoalDayToggleAPIView, HobbyListCreateAPIView, HobbyRetrieveUpdateDestroyAPIView, MusicVibeListCreateAPIView, MusicVibeRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('daylogs/', DayLogListCreateView.as_view(), name='daylog-list-create'),
    path('daylogs/<int:pk>/', DayLogDetailView.as_view(), name='daylog-detail'),
    path('archive/', ScrapbookArchiveAPIView.as_view(), name='scrapbook-archive'),
    path('archive/<int:pk>/', ScrapbookStampDetailAPIView.as_view(), name='scrapbook-stamp-detail'),
    path('node-matrix/', NoteListCreateAPIView.as_view()),
    path('node-matrix/<int:pk>/', NoteRetrieveUpdateDestroyAPIView.as_view()),
    path('wishes/', DreamWishListCreateAPIView.as_view(), name='wish-list-create'),
    path('wishes/<int:pk>/', DreamWishDetailAPIView.as_view(), name='wish-detail'),
    path('watchlist/', WatchlistItemListCreateAPIView.as_view(), name='watchlist-list-create'),
    path('watchlist/<int:pk>/', WatchlistItemRetrieveUpdateDestroyAPIView.as_view(), name='watchlist-detail'),
    path('Goals/', GoalListCreateAPIView.as_view()),
    path('Goals/<int:pk>/', GoalRetrieveUpdateDestroyAPIView.as_view()),
    path('Goals/<int:pk>/days/<int:day_number>/toggle/', GoalDayToggleAPIView.as_view()),
    path('hobbies/', HobbyListCreateAPIView.as_view(), name='hobby-list-create'),
    path('hobbies/<int:pk>/', HobbyRetrieveUpdateDestroyAPIView.as_view(), name='hobby-detail'),
    path('music-vibes/', MusicVibeListCreateAPIView.as_view(), name='music-vibe-list-create'),
    path('music-vibes/<int:pk>/', MusicVibeRetrieveUpdateDestroyAPIView.as_view(), name='music-vibe-detail'),
    path('tasks/',        TaskListCreateAPIView.as_view(),          name='task-list-create'),
    path('tasks/<int:pk>/', TaskRetrieveUpdateDestroyAPIView.as_view(), name='task-detail'),
 

]


