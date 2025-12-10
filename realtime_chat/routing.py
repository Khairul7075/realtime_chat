# realtime_chat/routing.py
import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import chat.routing

# Ensure Django settings are loaded
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "realtime_chat.settings")

# Django's default ASGI app for handling traditional HTTP requests
django_asgi_app = get_asgi_application()

# ProtocolTypeRouter directs requests based on type (http vs websocket)
application = ProtocolTypeRouter({
    "http": django_asgi_app,   # Handles normal HTTP requests
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns  # Handles WebSocket requests
        )
    ),
})
