const { fcmInitialized } = require("../../utils/socket/initializefcm");
const admin = require("firebase-admin");

// FCM Push Notification Sender
exports.sendPushNotification = async (receiver, title, body) => {
  if (!fcmInitialized) {
    console.error(
      "Firebase Admin SDK not initialized. Skipping push notification."
    );
    return;
  }
  //fcmToken, params se lena hoga ager user karna hai
  // if (!fcmToken) {
  //   console.error("FCM Token is required but was not provided.");
  //   return;
  // }
  console.log("receiver, title, body", receiver, title, body);

  const message = {
    topic: receiver, //fcmToken,
    notification: {
      title: title,
      body: body,
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
