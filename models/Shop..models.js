const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const ShopSchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    shopCity: { type: String, required: true },
    shopState: { type: String, required: true },
    shopZipCode: { type: String, required: true },
    profileImage: {
      type: Object,
      default: {},
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        default: [0, 0], // Default coordinates (longitude, latitude)
      },
    },
  },
  { timestamps: true }
);

ShopSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Shop", ShopSchema);
