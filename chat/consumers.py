import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
     # Inside your ChatConsumer class

     async def user_join(self, event):
            username = event["username"]
            # Send join notification to WebSocket
            await self.send(text_data=json.dumps({
                "type": "user_join",
                "username": username,
                "message": f"{username} joined the room"
            }))

     async def user_leave(self, event):
            username = event["username"]
            # Send leave notification to WebSocket
            await self.send(text_data=json.dumps({
                "type": "user_leave",
                "username": username,
                "message": f"{username} left the room"
            }))

     async def connect(self):
            # Extract room name from URL
            self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
            self.room_group_name = f"chat_{self.room_name}"
            user = self.scope["user"]

            # Block anonymous users for security
            if user.is_anonymous:
                await self.close()
                return

            try:
                # Add this channel to the group
                await self.channel_layer.group_add(self.room_group_name, self.channel_name)
                await self.accept()

                # Notify group of user join (optional polish)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_join",
                        "username": user.username,
                    }
                )

                # Mark user as online (optional persistence)
                # Example: update a RoomParticipant model if you have one
                # await RoomParticipant.objects.update_or_create(
                #     room_name=self.room_name, user=user, defaults={"is_online": True}
                # )

            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error connecting {user}: {e}")
                await self.close()


     async def disconnect(self, close_code):
            user = self.scope.get("user")
            try:
                # Remove this channel from the group
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

                # Notify group of user leave (optional polish)
                if user and not user.is_anonymous:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "user_leave",
                            "username": user.username,
                        }
                    )

                # Mark user as offline (optional persistence)
                # Example: update a RoomParticipant model if you have one
                # await RoomParticipant.objects.filter(room_name=self.room_name, user=user).update(is_online=False)

            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Error disconnecting {user}: {e}")

     @database_sync_to_async
     def save_message(self, room_name, user, content):
        from .models import Room, Message
        room, _ = Room.objects.get_or_create(name=room_name)
        return Message.objects.create(room=room, author=user, content=content)

     @database_sync_to_async
     def mark_seen(self, message_id, user):
        from .models import Message
        msg = Message.objects.get(id=message_id)
        msg.seen_by.add(user) 
        room = msg.room
        total_participants = room.participants.count()
        seen_count = msg.seen_by.count()

        all_seen = (seen_count == total_participants)
        return msg, all_seen

     async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type", "message")
        user = self.scope["user"]

        if not user.is_authenticated:
            return

        # Typing indicator
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_event",
                    "username": user.username,
                    "is_typing": data.get("is_typing", False),
                }
            )
            return

        # Message editing
        if event_type == "edit_message":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": data.get("new_content"),
                    "sender": user.username,
                    "edited": True,
                    "message_id": data.get("message_id"),
                }
            )
            return

        # Read receipts
        if event_type == "seen":
            msg_id = data.get("message_id")
            if msg_id:
                msg, all_seen = await self.mark_seen(msg_id, user)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "read_receipt",
                        "message_id": msg.id,
                        "reader": user.username,
                        "all_seen": all_seen,
                    }
                )
            return

        # Normal message
        message = data.get("message")
        if not message or not message.strip():
            return

        msg = await self.save_message(self.room_name, user, message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": msg.content,
                "sender": user.username,
                "message_id": msg.id,   #  include ID for receipts
            }
        )

     async def chat_message(self, event):
        payload = {
            "message": event["message"],
            "sender": event["sender"],
            "message_id": event.get("message_id"),
            
            
        }
        if event.get("edited"):
            payload["edited"] = True
        await self.send(text_data=json.dumps(payload))

     async def typing_event(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "username": event["username"],
            "is_typing": event["is_typing"],
        }))

     async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "message_id": event["message_id"],
            "reader": event["reader"],
             "all_seen": event["all_seen"],
        }))
