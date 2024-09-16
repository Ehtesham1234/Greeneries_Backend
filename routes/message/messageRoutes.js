const express = require("express");
const router = express.Router();
const messageController = require("../../controllers/Message/messageController");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");

router.get(
  "/messages/:userId/:shopId",
  verifyUser,
  messageController.getMessages
);
router.get("/messages", verifyUser, messageController.getUserMessages);

exports.router = router;
