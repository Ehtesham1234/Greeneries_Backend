const mongoose = require("mongoose");
const Order = require("../../models/Order.models");
const Cart = require("../../models/Cart.models");
const Product = require("../../models/Product.models");
const Purchased = require("../../models/Purchased.models");
const Buyer = require("../../models/Buyer.models");
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
        plantProgress: {
          isPlant: true,
          plantName: product.name,
          growthStage: 0,
          tasksCompleted: 0,
        },
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
      const userId = order.userId;
      const buyerId = await Buyer.findOne({ _id: userId }).select("user");
      // console.log("Cart found console 4:", JSON.stringify(buyerId, null, 2));
      const cart = await Cart.findOne({ userId: buyerId.user });
      // console.log("Cart found console 5:", JSON.stringify(cart, null, 2));
      if (order) {
        await confirmOrder(order._id);
        order.razorpayPaymentId = razorpayPaymentId;
        order.razorpaySignature = razorpaySignature;
        await order.save();
      }

      if (cart) {
        // console.log("Cart found console 6:", JSON.stringify(cart, null, 2));
        // Update cart (remove non-wishlist items)
        cart.products = cart.products.filter((item) => item.isWishList);
        await cart.save();

        // console.log("Cart found console 7:", JSON.stringify(cart, null, 2));
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
