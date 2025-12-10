 
    const username = "{{ user.username|default:'Anonymous' }}";
    const roomName = "{{ room_name }}";

    const chatSocket = new WebSocket(
        "ws://" + window.location.host + "/ws/chat/" + roomName + "/"
    );

    function getTime() {
        const now = new Date();
        return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Typing indicator
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
                   if (data.all_seen) {
                        statusSpan.textContent = "✓✓";
                        statusSpan.classList.add("seen");
                    } else {
                        statusSpan.textContent = "✓✓";
                        statusSpan.classList.remove("seen");
                    }

                }
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
        // Send the message over WebSocket
        chatSocket.send(JSON.stringify({
            type: "message",
            message: message
        }));

        // Clear the input field
        inputEl.value = "";

        // Stop typing indicator immediately after sending
        sendTyping(false);
        typingSent = false;
        if (stopTypingTimer) clearTimeout(stopTypingTimer);
    }
};

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

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
    fetch(`/chat/ajax/edit/${msgId}/`, {
        method: "POST",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
        body: new URLSearchParams({ content: newContent })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const msgElem = document.querySelector(`#msg-${msgId}`);
            msgElem.querySelector(".edit-input").remove();
            msgElem.querySelector(".content").textContent = data.new_content;
            msgElem.querySelector(".edited").textContent = "(edited)";
        }
    });
}

 