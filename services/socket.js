const admin = require("firebase-admin");
const Message = require("../models/Message.models");

// Initialize Firebase Admin SDK
// const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  }),
});

// FCM Push Notification Sender (modularized)
const sendPushNotification = async (fcmToken, notification) => {
  console.log("Sending notification with token:", fcmToken);
  if (!fcmToken) {
    console.error("FCM Token is required but was not provided.");
    return;
  }
  const message = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    android: {
      priority: "high",
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// Socket.IO Message Handler
const handleSocketConnection = (io) => {
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle user joining their specific room (e.g., userId as room ID)
    socket.on("join", (userId) => {
      try {
        console.log(`User ${userId} joined room ${userId}`);
        socket.join(userId); // Join the room for this user (typically userId or chatId)
      } catch (error) {
        console.error("Error handling join event:", error);
      }
    });

    // Handle incoming messages
    socket.on(
      "event:message",
      async ({ text, sender, receiver, name, timestamp, fcmToken }) => {
        console.log("New message received:", text);

        try {
          if (!text) throw new Error("Message text is required");

          const newMessage = new Message({ text, sender, receiver, timestamp });
          await newMessage.save();

          // Emit the message to both the sender and receiver
          io.to(receiver)
            .to(sender)
            .emit("message", JSON.stringify(newMessage));

          // Check if the receiver is online (based on whether the room exists or has members)
          const receiverRoom = io.sockets.adapter.rooms.get(receiver);
          // if (!receiverRoom || receiverRoom.size === 0) {
          //   // Send a push notification if the receiver is not connected
          //   await sendPushNotification(fcmToken, {
          //     title: "New Message",
          //     body: `You have a new message from ${name}`,
          //   });
          // }
        } catch (error) {
          console.error("Error handling message event:", error.message);
        }
      }
    );

    // Handle socket disconnections
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${reason}`);
    });

    // Handle nodemon restarts (gracefully disconnect clients)
    process.once("SIGUSR2", () => {
      console.log("Nodemon restarting, cleaning up connections.");
      io.sockets.emit("disconnect");
      process.kill(process.pid, "SIGUSR2");
    });
  });
};

module.exports = { handleSocketConnection };
