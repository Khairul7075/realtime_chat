



// Read values injected by Django template
const roomName = window.chatConfig.roomName;
const username = window.chatConfig.username;

// WebSocket setup
const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const chatSocket = new WebSocket(
    protocol + window.location.host + "/ws/chat/" + roomName + "/"
);

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Handle incoming messages
chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);

    if (data.type === "delete_message") {
        const msgElem = document.querySelector(`#msg-${data.message_id}`);
        if (msgElem) msgElem.innerHTML = "<em>Message deleted</em>";
        return;
    }

    if (data.type === "edit_message") {
        const msgElem = document.querySelector(`#msg-${data.message_id}`);
        if (msgElem) {
            const contentSpan = msgElem.querySelector(".content");
            if (contentSpan) contentSpan.textContent = data.new_content;
            const editedSpan = msgElem.querySelector(".edited");
            if (editedSpan) editedSpan.textContent = "(edited)";
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
            <span class="status">✓</span>`;
    } else {
        msgDiv.classList.add("received");
        msgDiv.innerHTML = `${data.sender}: <span class="content">${data.message}</span>
            <span class="timestamp">Received at ${getTime()}</span>`;
    }

    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
};

// Send message

const inputEl = document.querySelector("#chat-message-input");
document.querySelector("#chat-message-submit").onclick = function() {
    const message = inputEl.value.trim();
    if (message) {
        chatSocket.send(JSON.stringify({
            type: "message",
            message: message
        }));
        inputEl.value = "";
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

// Deleting
function deleteMessage(msgId) {
    chatSocket.send(JSON.stringify({
        type: "delete_message",
        message_id: msgId
    }));
}
