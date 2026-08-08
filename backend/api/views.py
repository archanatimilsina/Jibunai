from rest_framework import generics
from .models import  AboutMe, DayLog, OperativeGoal, ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, HobbyItem, MusicVibeItem, Task
from .serializers import  DreamWishSerializer, WatchlistItemSerializer, HobbyItemSerializer, MusicVibeItemSerializer, TaskSerializer, AboutMeSerializer, DayLogSerializer, OperativeNoteSerializer, ScrapbookStampSerializer, DreamWishSerializer, WatchlistItemSerializer, OperativeGoalSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 


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
    queryset = OperativeGoal.objects.all()
    serializer_class = OperativeGoalSerializer

class GoalRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OperativeGoal.objects.all()
    serializer_class = OperativeGoalSerializer



class GoalListCreateAPIView(generics.ListCreateAPIView):

    queryset = OperativeGoal.objects.all()
    serializer_class = OperativeGoalSerializer

class GoalRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):

    queryset = OperativeGoal.objects.all()
    serializer_class = OperativeGoalSerializer

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
 


