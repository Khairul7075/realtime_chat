from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Room(models.Model):
    name = models.CharField(max_length=50, unique=True)
    participants = models.ManyToManyField(User, related_name="chat_rooms")
    created_at = models.DateTimeField(default=timezone.now)  # remove auto_now_add

    class Meta:
        ordering = ["name"]
        verbose_name = "Chat Room"
        verbose_name_plural = "Chat Rooms"

    def __str__(self):
        return f"{self.name} (created {self.created_at:%Y-%m-%d %H:%M})"


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)  # soft delete flag 
    edited = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    seen_by = models.ManyToManyField(User, related_name="seen_messages", blank=True)

    class Meta:
        ordering = ["timestamp"]  # messages sorted chronologically
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self):
        status = "deleted" if self.is_deleted else "active"
        return f"{self.author.username} in {self.room.name} ({status}): {self.content[:30]}"
