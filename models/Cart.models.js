const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const CartSchema = new mongoose.Schema(
  {
    owner: {
      type: ObjectId,
      required: true,
      ref: "Buyer",
    },
    products: [
      {
        productId: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: Number,
      },
    ],
    bill: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

exports.Cart = mongoose.model("Cart", CartSchema);
