from django.urls import path
from .views import ProjectDetailView, ProfessionalDevelopmentListView, TaskRetrieveUpdateDestroyAPIView, TaskListCreateAPIView, projectListView, ProfessionalDevelopmentDetailView, AboutMeListCreateView, AboutMeRetrieveUpdateDestroyView, DayLogListCreateView, DayLogDetailView, ScrapbookArchiveAPIView, ScrapbookStampDetailAPIView, NoteListCreateAPIView, NoteRetrieveUpdateDestroyAPIView, DreamWishListCreateAPIView, DreamWishDetailAPIView, WatchlistItemListCreateAPIView, WatchlistItemRetrieveUpdateDestroyAPIView, GoalListCreateAPIView, VerifySecretView, GoalRetrieveUpdateDestroyAPIView, HobbyListCreateAPIView, HobbyRetrieveUpdateDestroyAPIView, MusicVibeListCreateAPIView, MusicVibeRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('projectListView/',projectListView.as_view() ),
    path('projectDetailView/<int:pk>/', ProjectDetailView.as_view()),
    path('pdListView/',ProfessionalDevelopmentListView.as_view() ),
    path('pdDetailView/<int:pk>/', ProfessionalDevelopmentDetailView.as_view()),
    path('aboutme', AboutMeListCreateView.as_view(), name='aboutme-list-create'),
    path('aboutme/<int:pk>/', AboutMeRetrieveUpdateDestroyView.as_view(), name='aboutme-detail'),
    path('daylogs/', DayLogListCreateView.as_view(), name='daylog-list-create'),
    path('daylogs/<int:pk>/', DayLogDetailView.as_view(), name='daylog-detail'),
    path('archive/', ScrapbookArchiveAPIView.as_view(), name='scrapbook-archive'),
    path('archive/<int:pk>/', ScrapbookStampDetailAPIView.as_view(), name='scrapbook-stamp-detail'),
    path('node-matrix/', NoteListCreateAPIView.as_view(), name='thought-matrix-mechanical-listing-mechanical-mécanique'),
    path('node-matrix/<int:pk>/', NoteRetrieveUpdateDestroyAPIView.as_view(), name='thought-matrix-mechanical-node-manipulation mechanical mechanical mécanique'),
    path('wishes/', DreamWishListCreateAPIView.as_view(), name='wish-list-create'),
    path('wishes/<int:pk>/', DreamWishDetailAPIView.as_view(), name='wish-detail'),
    path('watchlist/', WatchlistItemListCreateAPIView.as_view(), name='watchlist-list-create'),
    path('watchlist/<int:pk>/', WatchlistItemRetrieveUpdateDestroyAPIView.as_view(), name='watchlist-detail'),
    path('Goals/', GoalListCreateAPIView.as_view(), name='goal-listing-dispatch-mechanical-mechanics-mécanique mechanics mechanical mechanics mechanics mechanics mechanical mécanique mechanics mechanical mechanical mechanical mechanics mechanical mechanics mechanical mécanique mechanics mechanical mechanics mechanical mécanique mechanical mechanical mécanique mechanical mechanical mécanique.'),
    path('Goals/<int:pk>/', GoalRetrieveUpdateDestroyAPIView.as_view(), name='goal-detail-mutation-mechanical-mechanics-mécanique mechanics mechanical mechanics mechanical mécanique.'),
    path('hobbies/', HobbyListCreateAPIView.as_view(), name='hobby-list-create'),
    path('hobbies/<int:pk>/', HobbyRetrieveUpdateDestroyAPIView.as_view(), name='hobby-detail'),
    path('music-vibes/', MusicVibeListCreateAPIView.as_view(), name='music-vibe-list-create'),
    path('music-vibes/<int:pk>/', MusicVibeRetrieveUpdateDestroyAPIView.as_view(), name='music-vibe-detail'),
    path('tasks/',        TaskListCreateAPIView.as_view(),          name='task-list-create'),
    path('tasks/<int:pk>/', TaskRetrieveUpdateDestroyAPIView.as_view(), name='task-detail'),
    path('verify-secret/', VerifySecretView.as_view(), name='verify-secret'),
 

]


