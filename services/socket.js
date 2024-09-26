const { socketAuth } = require("../middleware/validateToken.middleware");
const {
  handleLikeEvent,
  handleMessageEvent,
} = require("../controllers/Socket/socketController");

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
      } catch (error) {
        console.error("Error handling join event:", error);
      }
    });

    handleLikeEvent(io, socket);
    handleMessageEvent(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${(reason, socket.id)}`);
    });
  });
};

module.exports = { handleSocketConnection };
