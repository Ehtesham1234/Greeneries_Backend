const admin = require("firebase-admin");
const Message = require("../models/Message.models");

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID_FIREBASE,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};

let fcmInitialized = false;

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  fcmInitialized = true;
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

// FCM Push Notification Sender
const sendPushNotification = async (fcmToken, notification) => {
  if (!fcmInitialized) {
    console.error(
      "Firebase Admin SDK not initialized. Skipping push notification."
    );
    return;
  }

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
    console.log("Successfully sent push notification:", response);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

// Socket.IO Message Handler
const handleSocketConnection = (io) => {
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

    socket.on(
      "event:message",
      async ({ text, sender, receiver, name, timestamp, fcmToken }) => {
        console.log("New message received:", text);

        try {
          if (!text) throw new Error("Message text is required");

          const newMessage = new Message({ text, sender, receiver, timestamp });
          await newMessage.save();
          console.log("received : ", receiver);

          // Emit the message only to the receiver
          io.to(receiver).emit("message", JSON.stringify(newMessage));

          // Check if the receiver is online
          const receiverRoom = io.sockets.adapter.rooms.get(receiver);
          if (!receiverRoom || receiverRoom.size === 0) {
            // Send a push notification if the receiver is not connected
            try {
              if (fcmInitialized && fcmToken) {
                await sendPushNotification(fcmToken, {
                  title: "New Message",
                  body: `${name}: ${text}`,
                });
              } else {
                console.log(
                  "Skipping push notification: FCM not initialized or token missing"
                );
              }
            } catch (error) {
              console.error("Error sending push notification:", error);
              // Optionally emit an error back to the client if needed
            }
          }
        } catch (error) {
          console.error("Error handling message event:", error.message);
          // You might want to emit an error event back to the sender
          socket.emit("message:error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${(reason, socket.id)}`);
    });
  });
};

module.exports = { handleSocketConnection };
