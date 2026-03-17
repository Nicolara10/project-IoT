const socket = io();

const usernameInput = document.getElementById("username");
const joinButton = document.getElementById("join-button");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");

let currentUsername = "";
let typingMessage = null;
let toxicityModel = null; 

function showMessage(text) {
  const messageElement = document.createElement("p");
  messageElement.textContent = text;
  messages.appendChild(messageElement);
  messages.scrollTop = messages.scrollHeight;
}

function showTypingMessage(text) {
  if (!typingMessage) {
    typingMessage = document.createElement("p");
    messages.appendChild(typingMessage);
  }

  typingMessage.textContent = text;
  messages.scrollTop = messages.scrollHeight;
}

function removeTypingMessage() {
  if (typingMessage) {
    typingMessage.remove();
    typingMessage = null;
  }
}

toxicity.load(0.7).then((model) => {
  toxicityModel = model;

  console.log("Toxicity model loaded");
});

joinButton.addEventListener("click", () => {
  if (usernameInput.value.trim() === "") {
    alert("Please enter a username");
    return;
  }

  currentUsername = usernameInput.value;
  socket.emit("user joined", currentUsername);
  showMessage("You joined the chat as " + currentUsername);
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUsername) {
    alert("Join the chat first");
    return;
  }

  if (messageInput.value.trim() === "") {
    return;
  }

  let messageToSend = messageInput.value; 

  if (toxicityModel) {
    const predictions = await toxicityModel.classify([messageInput.value]);
    let isToxic = false; 

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].results[0].match === true) {
        isToxic = true;
      }
    }

    if (isToxic) {
      messageToSend = "*****";
    }
  }

  socket.emit("chat message", {
    username: currentUsername,
    message: messageToSend
  });

  messageInput.value = "";
  removeTypingMessage();
});

messageInput.addEventListener("keypress", () => {
  socket.emit("typing", currentUsername);
});

socket.on("chat message", (data) => {
  removeTypingMessage();
  showMessage(data.username + ": " + data.message);
});

socket.on("system message", (message) => {
  showMessage(message);
});

socket.on("typing", (username) => {
  showTypingMessage(username + " is typing...");

  setTimeout(() => {
    removeTypingMessage();
  }, 1000);
});
