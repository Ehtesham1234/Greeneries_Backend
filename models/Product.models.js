const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const ReviewSchema = new Schema({
  user: { type: ObjectId, ref: "User" },
  review: { type: String },
});

const ProductSchema = mongoose.Schema(
  {
    user: {
      type: ObjectId,
      required: true,
      ref: "Shop",
    },
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      default: "SKU",
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
      trim: true,
    },
    quantity: {
      type: String,
      required: [true, "Please add a quantity"],
      trim: true,
    },
    price: {
      type: String,
      required: [true, "Please add a price"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trim: true,
    },
    image: {
      type: Object,
      default: {},
    },
    reviews: [ReviewSchema],
    availability: {
      type: String,
      required: true,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

exports.Product = mongoose.model("Product", ProductSchema);
