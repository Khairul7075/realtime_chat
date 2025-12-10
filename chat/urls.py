from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    path("", views.index, name="index"),  # homepage
    path("<str:room_name>/", views.room, name="room"),
    path("delete/<int:message_id>/", views.delete_message, name="delete_message"),
    path("edit/<int:message_id>/", views.edit_message, name="edit_message"),
    path("ajax/edit/<int:msg_id>/", views.ajax_edit_message, name="ajax_edit_message"),

]
