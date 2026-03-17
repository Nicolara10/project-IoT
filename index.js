import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("user joined", (username) => {
    socket.broadcast.emit("system message", `${username} joined the chat.`);
  });

  socket.on("chat message", (data) => {
    if (!data.message) {
      return;
    }

    io.emit("chat message", data);
  });

  socket.on("typing", (username) => {
    io.emit("typing", username);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
