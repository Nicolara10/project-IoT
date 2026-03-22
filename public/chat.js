const socket = io();

const usernameInput = document.getElementById("username");
const joinButton = document.getElementById("join-button");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");

let currentUsername = "";
let typingMessage = null;
let toxicityModel = null;

const firebaseConfig = {
  apiKey: "AIzaSyB9iN5sdrOQSpX_TqdxPFV58miMOgQ7-OM",
  authDomain: "web-sockets-chat.firebaseapp.com",
  projectId: "web-sockets-chat",
  storageBucket: "web-sockets-chat.firebasestorage.app",
  messagingSenderId: "887538508268",
  appId: "1:887538508268:web:85b31b8df35eb4ef1a20c9",
  measurementId: "G-5JGGJGDCZL"
};

// start Firebase using the config above
firebase.initializeApp(firebaseConfig);

// connect to Firestore so we can save and load chat messages
const db = firebase.firestore();

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

// get the last 10 messages from Firestore when a user joins
async function loadOldMessages() {
  // clear the current messages so we do not repeat them if join is clicked again
  messages.innerHTML = "";

  // ask Firestore for the newest 10 messages
  const snapshot = await db
    .collection("messages")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  const oldMessages = [];

  // save each Firestore message into an array
  snapshot.forEach((doc) => {
    oldMessages.push(doc.data());
  });

  // reverse the array so the oldest of the 10 shows first
  oldMessages.reverse();

  // show each old message in the chat box
  for (let i = 0; i < oldMessages.length; i++) {
    showMessage(oldMessages[i].username + ": " + oldMessages[i].message);
  }
}

// load the toxicity model one time when the page first opens 0.7 was tested for better relibality
toxicity.load(0.7).then((model) => {
  toxicityModel = model;
  console.log("Toxicity model loaded");
});

joinButton.addEventListener("click", async () => {
  if (usernameInput.value.trim() === "") {
    alert("Please enter a username");
    return;
  }

  currentUsername = usernameInput.value;

  // load the last 10 saved messages from Firestore
  await loadOldMessages();

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

  // check the message with the toxicity model before sending it
  if (toxicityModel) {
    const predictions = await toxicityModel.classify([messageInput.value]);
    let isToxic = false;

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].results[0].match === true) {
        isToxic = true;
      }
    }

    // replace the full message with stars if it is toxic
    if (isToxic) {
      messageToSend = "*****";
    }
  }

  // save the message in Firestore with username, message, and timestamp
  await db.collection("messages").add({
    username: currentUsername,
    message: messageToSend,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  // still send the message through the socket so the chat updates live
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
