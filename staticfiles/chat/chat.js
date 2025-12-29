const username = "{{ user.username|default:'Anonymous' }}";
const roomName = "{{ room_name }}";

// Use ws:// for HTTP, wss:// for HTTPS
const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const chatSocket = new WebSocket(
    protocol + window.location.host + "/ws/chat/" + roomName + "/"
);

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Typing indicator setup
const chatContainer = document.querySelector(".chat-container");
const typingBar = document.createElement("div");
typingBar.id = "typing-indicator";
typingBar.style.fontSize = "12px";
typingBar.style.color = "#555";
typingBar.style.margin = "6px 2px";
typingBar.style.minHeight = "16px";
chatContainer.insertBefore(typingBar, chatContainer.querySelector(".input-area"));

let typingUsers = new Map();

function showTyping(username, isTyping) {
    if (isTyping) {
        if (typingUsers.has(username)) clearTimeout(typingUsers.get(username));
        const timeoutId = setTimeout(() => {
            typingUsers.delete(username);
            renderTyping();
        }, 2000);
        typingUsers.set(username, timeoutId);
    } else {
        if (typingUsers.has(username)) {
            clearTimeout(typingUsers.get(username));
            typingUsers.delete(username);
        }
    }
    renderTyping();
}

function renderTyping() {
    const others = Array.from(typingUsers.keys()).filter(u => u !== username);
    typingBar.textContent = others.length === 0 ? "" :
        (others.length === 1 ? `${others[0]} is typing…`
         : `${others.slice(0, 2).join(", ")}${others.length > 2 ? " +" + (others.length - 2) : ""} are typing…`);
}

chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);

    if (data.type === "user_join" || data.type === "user_leave") {
        const chatLog = document.querySelector("#chat-log");
        const notice = document.createElement("div");
        notice.classList.add("system-message");
        notice.textContent = data.message;
        chatLog.appendChild(notice);
        chatLog.scrollTop = chatLog.scrollHeight;
        return;
    }

    if (data.type === "typing") {
        showTyping(data.username, data.is_typing);
        return;
    }

    if (data.type === "read_receipt") {
        const msgElem = document.querySelector(`#msg-${data.message_id}`);
        if (msgElem) {
            const statusSpan = msgElem.querySelector(".status");
            if (statusSpan) {
                statusSpan.textContent = "✓✓";
                if (data.all_seen) {
                    statusSpan.classList.add("seen");
                } else {
                    statusSpan.classList.remove("seen");
                }
            }
        }
        return;
    }

    if (data.type === "delete_message") {
        const msgElem = document.querySelector(`#msg-${data.message_id}`);
        if (msgElem) {
            msgElem.innerHTML = "<em>Message deleted</em>";
        }
        return;
    }

    // Normal message
    const chatLog = document.querySelector("#chat-log");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");
    msgDiv.id = "msg-" + data.message_id;

    if (data.sender === username) {
        msgDiv.classList.add("sent");
        msgDiv.innerHTML = `<span class="content">${data.message}</span>
            <span class="timestamp">Sent at ${getTime()}</span>
            <span class="status">✓</span>
            <span class="edited">${data.edited ? "(edited)" : ""}</span>`;
    } else {
        msgDiv.classList.add("received");
        msgDiv.innerHTML = `${data.sender}: <span class="content">${data.message}</span>
            <span class="timestamp">Received at ${getTime()}</span>
            <span class="status"></span>
            <span class="edited">${data.edited ? "(edited)" : ""}</span>`;

        // Immediately mark as seen
        chatSocket.send(JSON.stringify({
            type: "seen",
            message_id: data.message_id
        }));
    }

    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
};

// Typing events
const inputEl = document.querySelector("#chat-message-input");
let typingSent = false;
let stopTypingTimer = null;

function sendTyping(isTyping) {
    chatSocket.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
}

inputEl.addEventListener("input", () => {
    if (!typingSent) {
        sendTyping(true);
        typingSent = true;
    }
    if (stopTypingTimer) clearTimeout(stopTypingTimer);
    stopTypingTimer = setTimeout(() => {
        sendTyping(false);
        typingSent = false;
    }, 1000);
}); 

inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        document.querySelector("#chat-message-submit").click();
    }
});

document.querySelector("#chat-message-submit").onclick = function() {
    const message = inputEl.value.trim();
    if (message) {
        chatSocket.send(JSON.stringify({
            type: "message",
            message: message
        }));
        inputEl.value = "";
        sendTyping(false);
        typingSent = false;
        if (stopTypingTimer) clearTimeout(stopTypingTimer);
    }
};

// Editing
function startEdit(msgId, oldContent) {
    const msgElem = document.querySelector(`#msg-${msgId}`);
    const contentSpan = msgElem.querySelector(".content");
    const editForm = document.createElement("input");
    editForm.type = "text";
    editForm.value = oldContent;
    editForm.classList.add("edit-input");

    msgElem.replaceChild(editForm, contentSpan);

    editForm.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            saveEdit(msgId, editForm.value);
        }
    });
}

function saveEdit(msgId, newContent) {
    chatSocket.send(JSON.stringify({
        type: "edit_message",
        message_id: msgId,
        new_content: newContent
    }));
}
