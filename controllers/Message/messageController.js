const Message = require("../../models/Message.models");
const Shop = require("../../models/Shop.models");
exports.getMessages = async (req, res, next) => {
  try {
    const { userId, shopId } = req.params;
    console.log(userId, shopId);

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: shopId },
        { sender: shopId, receiver: userId },
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
    // console.log("messages", messages);
    const userIds = messages.length > 0 ? messages[0].userIds : [];
    // console.log("userIds", userIds);
    // Populate user details
    const users = await Shop.find({ _id: { $in: userIds } }, "shopName");
    // console.log("users", users);
    if (!users) {
      res.status(200).json((users = []));
    }
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};
