const mongoose = require("mongoose");
const Order = require("../../models/Order.models");
const Cart = require("../../models/Cart.models");
const Product = require("../../models/Product.models");
const Purchased = require("../../models/Purchased.models");

exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, sellerId, paymentType } = req.body;

    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || cart.products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: "Cart is empty" });
    }

    const cartItems = cart.products.filter((item) => !item.isWishList);
    if (cartItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: "No items in cart" });
    }

    const totalAmount = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const order = new Order({
      userId,
      sellerId,
      products: cartItems.map((item) => item.productId),
      totalAmount,
      status: "pending",
      paymentType,
      paymentStatus: paymentType === "Online" ? "pending" : "not_applicable",
      orderDate: new Date(),
    });

    await order.save({ session });

    for (const item of cartItems) {
      await new Purchased({
        orderId: order._id,
        productId: item.productId,
        sellerId,
        quantity: item.quantity,
        price: item.price,
      }).save({ session });

      const product = await Product.findById(item.productId).session(session);
      if (product) {
        if (product.quantity < item.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res
            .status(400)
            .send({
              error: `Insufficient quantity for product: ${product.name}`,
            });
        }
        product.quantity -= item.quantity;
        await product.save({ session });
      }
    }

    await Cart.findByIdAndDelete(cart._id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).send({ isSuccess: true, order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).send({ isSuccess: false, message: "Server Error" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { orderId, status, paymentIntentId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (status === "paid") {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not successful" });
      }

      if (paymentIntent.amount_received < paymentIntent.amount) {
        order.status = "partially_paid";
        order.paymentStatus = "partially_paid";
        await order.save();
        return res.json({ status: "partially_paid" });
      }
    }

    order.status = status;
    order.paymentStatus = status === "paid" ? "received" : "pending";
    order.paymentIntentId = paymentIntentId;
    await order.save();

    res.json({ status: order.status });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId })
      .populate("sellerId", "name")
      .lean();

    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const purchasedItems = await Purchased.find({ orderId: order._id })
          .populate({
            path: "productId",
            select: "name description price image",
          })
          .lean();

        return { ...order, purchasedItems };
      })
    );

    res.status(200).send({ isSuccess: true, orders: detailedOrders });
  } catch (error) {
    console.error(error);
    res.status(500).send({ isSuccess: false, message: "Server Error" });
  }
};
