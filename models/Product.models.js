const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");
const ObjectId = mongoose.Schema.ObjectId;

const ReviewSchema = new Schema({
  user: { type: ObjectId, ref: "User" },
  review: { type: String },
});

const ProductSchema = mongoose.Schema(
  {
    seller: {
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
      unique: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Please add a quantity"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trim: true,
    },
    image: [
      {
        type: Object,
        default: {},
      },
    ],
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
    categories: [
      {
        type: ObjectId,
        ref: "PlantCategory",
        required: [true, "Please add at least one category"],
      },
    ],
    subcategories: [
      {
        type: ObjectId,
        ref: "PlantSubCategory",
      },
    ],
    scientificName: { type: String },
    careInstructions: { type: String },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    salePrice: {
      type: Number,
      trim: true,
    },
    productType: {
      type: String,
      enum: ["Plant", "Tree", "Accessory", "Other"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
ProductSchema.index({ name: 1 });
module.exports = mongoose.model("Product", ProductSchema);
