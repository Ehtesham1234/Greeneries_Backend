const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const BlogSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: ObjectId, ref: "User", required: true },
    likes: [{ type: ObjectId, ref: "User" }],
    likeCount: { type: Number, default: 0 },
    image: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);
