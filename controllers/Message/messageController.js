const Message = require("../../models/Message.models");
const Shop = require("../../models/Shop.models");
const User = require("../../models/User.models");

exports.getMessages = async (req, res, next) => {
  try {
    const { userId, receiver } = req.params;
    const { page = 1, limit = 15 } = req.query;

    const skip = (page - 1) * limit;

    // Find messages
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: receiver },
        { sender: receiver, receiver: userId },
      ],
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Count total messages
    const totalCount = await Message.countDocuments({
      $or: [
        { sender: userId, receiver: receiver },
        { sender: receiver, receiver: userId },
      ],
    });

    // Mark messages as read
    await Message.updateMany(
      {
        sender: receiver,
        receiver: userId,
        read: false,
      },
      { $set: { read: true } }
    );

    // Update read status in the retrieved messages
    const updatedMessages = messages.map((msg) => {
      if (
        msg.sender.toString() === receiver &&
        msg.receiver.toString() === userId
      ) {
        return { ...msg.toObject(), read: true };
      }
      return msg;
    });

    res.status(200).json({
      messages: updatedMessages,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Use aggregation to find distinct user IDs and unread message counts
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastMessage: { $last: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 1,
          unreadCount: 1,
          lastMessage: 1,
        },
      },
    ]);

    const userIds = messages.map((m) => m._id);

    // Fetch user details
    const users = await User.find({ _id: { $in: userIds } }, "userName email");
    const shops = await Shop.find({ _id: { $in: userIds } }, "shopName");

    // Combine user and shop details with unread counts
    const combinedUsers = users.map((user) => {
      const messageData = messages.find(
        (m) => m._id.toString() === user._id.toString()
      );
      return {
        _id: user._id,
        name: user.userName,
        type: "user",
        unreadCount: messageData ? messageData.unreadCount : 0,
        lastMessage: messageData ? messageData.lastMessage : null,
      };
    });

    const combinedShops = shops.map((shop) => {
      const messageData = messages.find(
        (m) => m._id.toString() === shop._id.toString()
      );
      return {
        _id: shop._id,
        name: shop.shopName,
        type: "shop",
        unreadCount: messageData ? messageData.unreadCount : 0,
        lastMessage: messageData ? messageData.lastMessage : null,
      };
    });

    const combinedResults = [...combinedUsers, ...combinedShops].sort(
      (a, b) =>
        new Date(b.lastMessage?.timestamp) - new Date(a.lastMessage?.timestamp)
    );

    res.status(200).json(combinedResults);
  } catch (error) {
    next(error);
  }
};
