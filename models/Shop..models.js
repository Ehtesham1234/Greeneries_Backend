const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const ShopSchema = new Schema(
  {
    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    shopCity: { type: String, required: true },
    shopZipCode: { type: String, required: true },
    profileImage: {
      type: Object,
      default: {},
    },
    location: {
      type: { type: String },
      coordinates: [Number],
    },
  },
  { timestamps: true }
);
// Ensure the location field is indexed as '2dsphere' for geospatial queries
ShopSchema.index({ location: "2dsphere" });
exports.Shop = mongoose.model("Shop", ShopSchema);
