const { socketAuth } = require("../middleware/validateToken.middleware");
const {
  handleLikeEvent,
  handleMessageEvent,
} = require("../controllers/Socket/socketController");
const Message = require("../models/Message.models");
// Socket.IO Message Handler
const handleSocketConnection = (io) => {
  io.use(socketAuth());
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("join", (userId) => {
      try {
        console.log(
          `User ${userId} joined room ${userId} with socket ID ${socket.id}`
        );
        socket.join(userId);
        socket.userId = userId; // Assign userId to socket
        // Emit online status to all connected clients
        io.emit("onlineStatus", { userId, status: "online" });
      } catch (error) {
        console.error("Error handling join event:", error);
      }
    });

    // Listen for 'enterChat' event to track if user is in Chat or Messages component
    socket.on("enterChatorMessage", () => {
      if (socket.userId) {
        socket.join(`inChat_${socket.userId}`);
        // console.log(`User ${socket.userId} entered chat`);
      }
    });

    // Listen for 'leaveChat' event to track if user leaves Chat or Messages component
    socket.on("leaveChatorMessage", () => {
      if (socket.userId) {
        socket.leave(`inChat_${socket.userId}`);
        // console.log(`User ${socket.userId} left chat`);
      }
    });

    handleLikeEvent(io, socket);
    handleMessageEvent(io, socket);
    socket.on("markMessagesAsRead", async ({ sender, receiver }) => {
      try {
        await Message.updateMany(
          { sender, receiver, read: false },
          { $set: { read: true } }
        );
        io.to(sender).emit("messagesMarkedAsRead", { sender, receiver });
      } catch (error) {
        console.error("Error marking messages as read:", error.message);
      }
    });
    socket.on("typing", ({ receiver, isTyping }) => {
      io.to(receiver).emit("typing", { userId: socket.userId, isTyping });
    });

    socket.on("checkOnlineStatus", (receiver) => {
      const isOnline = io.sockets.adapter.rooms.has(receiver);
      socket.emit("onlineStatus", {
        userId: receiver,
        status: isOnline ? "online" : "offline",
      });
    });
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${(reason, socket.id)}`);
      // Emit offline status to all connected clients
      if (socket.userId) {
        io.emit("onlineStatus", { userId: socket.userId, status: "offline" });
        // Leave all rooms
        socket.leaveAll();
      }
    });
  });
};

module.exports = { handleSocketConnection };
