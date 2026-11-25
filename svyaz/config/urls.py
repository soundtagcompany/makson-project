from django.urls import path
from chat.views import endpoint
urlpatterns = [path('api/svyaz/<str:action>', endpoint)]
