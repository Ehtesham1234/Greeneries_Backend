const { fcmInitialized } = require("../../utils/socket/initializefcm");
const admin = require("firebase-admin");

// FCM Push Notification Sender
exports.sendPushNotification = async (fcmToken, receiver, notification) => {
  if (!fcmInitialized) {
    console.error(
      "Firebase Admin SDK not initialized. Skipping push notification."
    );
    return;
  }

  // if (!fcmToken) {
  //   console.error("FCM Token is required but was not provided.");
  //   return;
  // }

  const message = {
    topic: receiver, //fcmToken,
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
