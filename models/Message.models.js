// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
