const mongoose = require("mongoose");
const Order = require("../../models/Order.models");
const Cart = require("../../models/Cart.models");
const Product = require("../../models/Product.models");
const Purchased = require("../../models/Purchased.models");

const crypto = require("crypto");

async function confirmOrder(orderId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = "processing";
    order.paymentStatus = "received";
    await order.save({ session });

    for (const orderItem of order.products) {
      const product = await Product.findById(orderItem.productId).session(
        session
      );
      if (!product) {
        throw new Error(`Product not found: ${orderItem.productId}`);
      }

      if (product.quantity < orderItem.quantity) {
        throw new Error(`Insufficient quantity for product: ${product.name}`);
      }

      product.quantity -= orderItem.quantity;
      await product.save({ session });

      await new Purchased({
        orderId: order._id,
        productId: orderItem.productId,
        sellerIds: [product.seller],
        quantity: orderItem.quantity,
        price: product.price,
      }).save({ session });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
exports.verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (generatedSignature === razorpaySignature) {
    try {
      const order = await Order.findOne({ razorpayOrderId });
      if (order) {
        await confirmOrder(order._id);
        order.razorpayPaymentId = razorpayPaymentId;
        order.razorpaySignature = razorpaySignature;
        await order.save();
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error confirming order:", error);
      res.status(500).json({ error: "Error confirming order" });
    }
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
};
