const Message = require("../../models/Message.models");
const Shop = require("../../models/Shop.models");
const User = require("../../models/User.models");
exports.getMessages = async (req, res, next) => {
  try {
    const { userId, receiver } = req.params;
    console.log(userId, receiver);

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: receiver },
        { sender: receiver, receiver: userId },
      ],
    }).sort({ timestamp: -1 });
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

exports.getUserMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Use aggregation to find distinct user IDs
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        $group: {
          _id: null,
          userIds: {
            $addToSet: {
              $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userIds: 1,
        },
      },
    ]);

    const userIds = messages.length > 0 ? messages[0].userIds : [];
    // console.log("userIds", userIds);
    // Fetch user details
    const users = await User.find({ _id: { $in: userIds } }, "userName email");
    const shops = await Shop.find({ _id: { $in: userIds } }, "shopName");

    // Combine user and shop details
    const combinedUsers = users.map((user) => ({
      _id: user._id,
      name: user.userName,
      type: "user",
    }));

    const combinedShops = shops.map((shop) => ({
      _id: shop._id,
      name: shop.shopName,
      type: "shop",
    }));

    const combinedResults = [...combinedUsers, ...combinedShops];

    res.status(200).json(combinedResults);
  } catch (error) {
    next(error);
  }
};
