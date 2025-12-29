from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Room, Message

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


@login_required
def delete_message(request, message_id):
    """Soft delete a message (author only)."""
    message = get_object_or_404(Message, id=message_id)

    if message.author == request.user:
        message.is_deleted = True
        message.save()

        # Broadcast delete via Channels
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{message.room.name}",
            {
                "type": "delete_message",
                "message_id": message.id,
            }
        )

    return redirect("chat:room", room_name=message.room.name)


@csrf_exempt
@login_required
def ajax_edit_message(request, msg_id):
    """AJAX endpoint for inline editing."""
    if request.method == "POST":
        new_content = request.POST.get("content", "").strip()
        try:
            msg = Message.objects.get(id=msg_id, author=request.user, is_deleted=False)
        except Message.DoesNotExist:
            return JsonResponse({"success": False, "error": "Message not found"})

        if new_content and new_content != msg.content:
            msg.content = new_content
            msg.edited = True
            msg.save()

            # Broadcast edit via Channels
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{msg.room.name}",
                {
                    "type": "edit_message",
                    "message_id": msg.id,
                    "new_content": msg.content,
                }
            )

            return JsonResponse({"success": True, "message_id": msg.id, "new_content": msg.content})

    return JsonResponse({"success": False})


@login_required
def edit_message(request, message_id):
    """Edit a message via form POST (author only)."""
    message = get_object_or_404(Message, id=message_id)

    if message.author == request.user and not message.is_deleted:
        if request.method == "POST":
            new_content = request.POST.get("content", "").strip()
            if new_content and new_content != message.content:
                message.content = new_content
                message.edited = True
                message.save()

                # Broadcast edit via Channels
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{message.room.name}",
                    {
                        "type": "edit_message",
                        "message_id": message.id,
                        "new_content": message.content,
                    }
                )

    return redirect("chat:room", room_name=message.room.name)


def room(request, room_name):
    """Render a chat room with its messages."""
    room, _ = Room.objects.get_or_create(name=room_name)
    messages = room.messages.select_related("author").order_by("timestamp")
    return render(request, "chat/room.html", {
        "room_name": room.name,
        "room": room,
        "messages": messages,
    })


def index(request):
    """List all available chat rooms."""
    rooms = Room.objects.all().order_by("name")
    return render(request, "chat/index.html", {"rooms": rooms})
