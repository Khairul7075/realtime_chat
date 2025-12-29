from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    # Homepage or chat index
    path("", views.index, name="index"),

    # Dynamic chat room
    path("room/<str:room_name>/", views.room, name="room"),

    # Message actions
    path("message/<int:message_id>/delete/", views.delete_message, name="delete_message"),
    path("message/<int:message_id>/edit/", views.edit_message, name="edit_message"),

    # AJAX edit endpoint
    path("ajax/message/<int:msg_id>/edit/", views.ajax_edit_message, name="ajax_edit_message"),
]
