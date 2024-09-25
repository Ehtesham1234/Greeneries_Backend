const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const purchasedSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  productId: [{ type: Schema.Types.ObjectId, ref: "Product", required: true }],
  sellerIds: [{ type: Schema.Types.ObjectId, ref: "Shop", required: true }],
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("Purchased", purchasedSchema);
