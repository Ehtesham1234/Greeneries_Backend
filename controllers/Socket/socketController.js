const Blog = require("../../models/Blog.models");
const Message = require("../../models/Message.models");
const { asyncHandler } = require("../../utils/asyncHandler");
const { sendPushNotification } = require("../../utils/socket/sendNotification");
const User = require("../../models/User.models");

// Socket.IO handler for likes
exports.handleLikeEvent = (io, socket) => {
  socket.on(
    "likeBlog",
    asyncHandler(async ({ blogId, userId }) => {
      try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
          return socket.emit("error", { message: "Blog not found" });
        }

        const user = await User.findById(userId);
        const blogIndex = blog.likes.indexOf(userId);
        const userIndex = user.likedBlogs.indexOf(blog._id);
        if (blogIndex === -1) {
          // Like the blog
          blog.likes.push(userId);
          blog.likeCount += 1;
        } else {
          // Unlike the blog
          blog.likes.splice(blogIndex, 1);
          blog.likeCount -= 1;
        }
        if (userIndex === -1) {
          // Like the blog
          user.likedBlogs.push(blog._id);
        } else {
          // Unlike the blog
          user.likedBlogs.splice(userIndex, 1);
        }
        await blog.save();
        await user.save();
        io.emit("blogLiked", blog); // Emit the updated blog to all clients
        // console.log("Blog liked:", blog);
        // console.log("Blog liked:", user);
      } catch (error) {
        console.error("Error handling like event:", error.message);
        socket.emit("error", { message: "Failed to like blog" });
      }
    })
  );
};

// Socket.IO handler for messages

exports.handleMessageEvent = (io, socket) => {
  socket.on(
    "event:message",
    async ({ text, sender, receiver, name, timestamp }) => {
      try {
        if (!text) throw new Error("Message text is required");
        // console.log("receiver", receiver);

        const newMessage = new Message({ text, sender, receiver, timestamp });
        await newMessage.save();

        const receiverRoom = `inChat_${receiver}`;
        const isReceiverInChat =
          io.sockets.adapter.rooms.has(receiverRoom) &&
          io.sockets.adapter.rooms.get(receiverRoom).size > 0;
        // console.log("isReceiverInChat", isReceiverInChat);
        if (isReceiverInChat) {
          // Receiver is in chat, emit the message through socket only
          io.to(receiver).emit("message", JSON.stringify(newMessage));
        } else {
          // Receiver is not in chat, emit the message and send a push notification
          io.to(receiver).emit("message", JSON.stringify(newMessage));

          // Send push notification
          const receiverUser = await User.findOne({ _id: receiver }).select(
            "fcmToken"
          );
          const fcmToken = receiverUser ? receiverUser.fcmToken : null;
          console.log("fcmToken", fcmToken);

          if (fcmToken) {
            const senderUser = await User.findOne({ _id: sender }).select(
              "userName fcmToken"
            );
            console.log("senderUserToken", senderUser);
            await sendPushNotification(
              fcmToken,
              "New Message",
              `${senderUser.userName}: ${text}`,
              {
                navigationId: "chat",
                senderId: sender,
                senderName: senderUser.userName,
              }
            );
            // console.log("Push notification sent");
          } else {
            console.log(
              "Skipping push notification: FCM token missing for user",
              receiver
            );
          }
        }

        // Emit typing event with isTyping set to false when a message is sent
        io.to(receiver).emit("typing", { userId: sender, isTyping: false });
      } catch (error) {
        console.error("Error handling message event:", error.message);
        socket.emit("message:error", { message: "Failed to send message" });
      }
    }
  );
};
