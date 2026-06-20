from django.shortcuts import render
from rest_framework import generics
from .models import ProfessionalDevelopment, Project, AboutMe, DayLog, OperativeGoal, ScrapbookStamp, OperativeNote, DreamWish, WatchlistItem, HobbyItem, MusicVibeItem, Task
from .serializers import ProfessionalDevelopmentSerializer, ProjectSerializer, DreamWishSerializer, WatchlistItemSerializer, HobbyItemSerializer, MusicVibeItemSerializer, TaskSerializer, AboutMeSerializer, DayLogSerializer, OperativeNoteSerializer, ScrapbookStampSerializer, DreamWishSerializer, WatchlistItemSerializer, OperativeGoalSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


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
 


class VerifySecretView(APIView):
    def post(self, request):
        field = request.data.get('field') 
        value = request.data.get('value', '')
        
        record = AboutMe.objects.first()
        if not record:
            return Response({'allowed': False})
        
        if field == 'gate':
            allowed = value == record.base_secret_code
        elif field == 'sidebar':
            allowed = value == record.sidebar_code
        elif field == 'dream':
            allowed = value == record.portal_dream
        else:
            allowed = False
            
        return Response({'allowed': allowed})