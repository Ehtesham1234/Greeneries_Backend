const { fcmInitialized, admin } = require("../../utils/socket/initializefcm");

// FCM Push Notification Sender

exports.sendPushNotification = async (fcmToken, title, body, data) => {
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

  // console.log("receiver, title, body, data", fcmToken, title, body, data);

  const message = {
    token: fcmToken,
    notification: {
      title: title,
      body: body,
      data: data,
    },
    android: {
      priority: "high",
    },
    // Include the additional data here
  };

  console.log("message", message);

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent push notification:", response);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
