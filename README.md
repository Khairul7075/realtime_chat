# 📱 Realtime Chat App (Django Channels)

A WhatsApp/Messenger‑style realtime chat application built with **Django Channels**, **WebSockets**, and **Redis**.  
This project demonstrates end‑to‑end realtime communication with professional UI/UX polish, suitable for portfolio showcase.

---

## ✨ Features

- 🔐 **Authentication** – only logged‑in users can join rooms
- 💬 **Realtime Messaging** – instant send/receive via WebSockets
- 📝 **Message Editing & Deletion** – inline editing with `(edited)` tag, deletion replaced with “Message deleted”
- ⌛ **Timestamps** – formatted message times (Today, Yesterday, etc.)
- 👀 **Read Receipts** – ✓ for delivered, ✓✓ for received, ✓✓ (blue) when seen by all participants
- ⌨️ **Typing Indicators** – show when a user is typing
- 👥 **Join/Leave Notifications** – system messages when users enter or exit rooms
- 📡 **Redis Integration** – scalable channel layer for multiple workers
- ⚠️ **Error Handling** – graceful disconnect warnings and logging
- 🎨 **UI/UX Polish** – styled message bubbles, responsive layout, system messages, dark mode ready

---

## 🛠 Tech Stack

- **Backend**: Django, Django Channels, Daphne, Redis
- **Frontend**: HTML, CSS, JavaScript (WebSocket client)
- **Database**: SQLite/PostgreSQL (configurable)
- **Deployment**: Daphne ASGI server

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/realtime_chat.git
cd realtime_chat
2. Create and activate a virtual environment 
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # Linux/Mac

3. Install dependencies 
pip install -r requirements.txt 
4. Run migrations
python manage.py migrate  
Start Redis (required for Channels)
redis-server
6. Run Daphne 
python -m daphne -p 8000 realtime_chat.asgi:application

realtime_chat/
│
├── chat/                          # App
│   ├── consumers.py
│   ├── routing.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── templates/
│   │   └── chat/
│   │       ├── index.html         # chat app index (list rooms, etc.)
│   │       └── room.html          # chat room page
│   └── static/
│       └── chat/
│           ├── chat.css
│           └── chat.js
│
├── realtime_chat/                 # Project
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├──                  # shared layout (navbar, scripts)
│
├─
│
├── requirements.txt
└── README.md

🖼 Screenshots
Chat room with realtime messages

Typing indicator and read receipts

Join/leave system messages

WhatsApp‑style ✓✓ ticks turning blue when seen

(Add screenshots or GIFs here for portfolio impact)

📌 Future Improvements
Emoji picker and file attachments

Group chat with per‑user read receipts

Dark mode toggle

Deployment on cloud (Heroku/Railway/AWS)

👨‍💻 Author
Khairul Haque Python Development Intern @ CodeClause (Batch December 2025) Focused on building polished, portfolio‑ready projects with Django, BI workflows, and automation.