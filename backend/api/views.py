from django.shortcuts import render
from rest_framework import generics, status
from .models import DayLog, OperativeGoal, GoalDayStatus, ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, HobbyItem, MusicVibeItem, Task
from .serializers import  DreamWishSerializer, HobbyItemSerializer, MusicVibeItemSerializer, TaskSerializer, DayLogSerializer, OperativeNoteSerializer, ScrapbookStampSerializer, DreamWishSerializer, WatchlistItemSerializer, OperativeGoalSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404


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
 
