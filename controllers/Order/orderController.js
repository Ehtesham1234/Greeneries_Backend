const mongoose = require("mongoose");
const Order = require("../../models/Order.models");
const Cart = require("../../models/Cart.models");
const Product = require("../../models/Product.models");
const Purchased = require("../../models/Purchased.models");
const User = require("../../models/User.models");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, buyerId, paymentType, cartData, totalAmount } = req.body;

    // Validate cart
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || cart.products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: "Cart is empty" });
    }

    // Filter out wishlist items
    const cartItems = cart.products.filter((item) => !item.isWishList);
    if (cartItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: "No items in cart" });
    }

    // Fetch seller IDs
    const sellerIds = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.productId).session(session);
        return product.seller;
      })
    );

    // Create pending order
    const order = new Order({
      userId: buyerId,
      sellerIds: [...new Set(sellerIds)],
      products: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      totalAmount,
      status: "pending",
      paymentType,
      paymentStatus: "pending",
      orderDate: new Date(),
    });

    // Handle online payment
    if (paymentType === "Online") {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100, // Convert to paise
        currency: "INR",
        receipt: order._id.toString(),
      });

      order.razorpayOrderId = razorpayOrder.id;
    }

    await order.save({ session });
    // console.log("Cart found console 1:", JSON.stringify(cart, null, 2));
    // Update cart
    await cart.save({ session });
    // console.log("Cart found console 2:", JSON.stringify(cart, null, 2));
    await session.commitTransaction();
    session.endSession();

    if (paymentType === "Online") {
      
    // console.log("Cart found console 3:", JSON.stringify(cart, null, 2));
      res.status(200).send({
        isSuccess: true,
        order,
        razorpayOrderId: order.razorpayOrderId,
        amount: totalAmount * 100,
        currency: "INR",
      });
    } else {
      
    // console.log("Cart found console 4:", JSON.stringify(cart, null, 2));
      // For COD, confirm the order immediately
      await confirmOrder(order._id);
      res.status(200).send({ isSuccess: true, order });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).send({ isSuccess: false, message: "Server Error" });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId });
    const buyerIds = user.buyer.map((buyer) => buyer._id);

    const orders = await Order.find({ userId: { $in: buyerIds } })
      .populate("sellerIds", "name")
      .select("_id totalAmount status orderDate")
      .lean();

    res.status(200).send({ isSuccess: true, orders });
  } catch (error) {
    console.error(error);
    res.status(500).send({ isSuccess: false, message: "Server Error" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("sellerIds", "name")
      .lean();
    if (!order) {
      return res
        .status(404)
        .send({ isSuccess: false, message: "Order not found" });
    }

    const purchasedItems = await Purchased.find({ orderId: order._id })
      .populate({
        path: "productId",
        select: "name description price image",
      })
      .lean();

    res
      .status(200)
      .send({ isSuccess: true, order: { ...order, purchasedItems } });
  } catch (error) {
    console.error(error);
    res.status(500).send({ isSuccess: false, message: "Server Error" });
  }
};
