from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Room, Message


@login_required
def delete_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)

    # Only allow the author to delete their own message
    if message.author == request.user:
        message.is_deleted = True   # soft delete instead of hard delete
        message.save()

    return redirect("chat:room", room_name=message.room.name)

@csrf_exempt
@login_required
def ajax_edit_message(request, msg_id):
    if request.method == "POST":
        new_content = request.POST.get("content", "").strip()
        msg = Message.objects.get(id=msg_id, author=request.user)
        msg.content = new_content
        msg.edited = True
        msg.save()
        return JsonResponse({"success": True, "message_id": msg.id, "new_content": msg.content})
    return JsonResponse({"success": False})

@login_required
def edit_message(request, message_id):
    
    message = get_object_or_404(Message, id=message_id)

    if message.author == request.user and not message.is_deleted:
        if request.method == "POST":
            new_content = request.POST.get("content")
            if new_content and new_content != message.content:
                message.content = new_content
                message.edited = True
                message.save()

                # Broadcast edit via Channels
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{message.room.name}",
                    {
                        "type": "chat_message",
                        "message": message.content,
                        "sender": message.author.username,
                        "edited": True,
                    }
                )

    return redirect("chat:room", room_name=message.room.name)


def room(request, room_name):
    room, created = Room.objects.get_or_create(name=room_name)
    messages = room.messages.select_related("author").order_by("timestamp")
    return render(request, "chat/room.html", {
        "room_name": room.name,
        "room": room,
        "messages": messages,
    })

def index(request):
    rooms = Room.objects.all().order_by("name")
    return render(request, "chat/index.html", {"rooms": rooms})
