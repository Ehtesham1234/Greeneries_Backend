const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  products: [{ type: Schema.Types.ObjectId, ref: "Product", required: true }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "processed", "delivered", "cancelled"],
    default: "pending",
  },
  paymentType: { type: String, enum: ["COD", "Online"], required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "received"],
    default: "pending",
  },
  orderDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date },
});

module.exports = mongoose.model("Order", orderSchema);
