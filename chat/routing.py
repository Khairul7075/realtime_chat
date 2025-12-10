from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Allow letters, numbers, underscores, and hyphens in room names
    re_path(r"ws/chat/(?P<room_name>[^/]+)/$", consumers.ChatConsumer.as_asgi())


]
