const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../../models/Order.models");

exports.createPaymentIntent = async (req, res) => {
  const { amount, orderId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { orderId },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
};

exports.processRefund = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "paid" && order.status !== "partially_paid") {
      return res
        .status(400)
        .json({ error: "Order is not eligible for refund" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.paymentIntentId
    );

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: paymentIntent.amount_received,
    });

    if (refund.status === "succeeded") {
      order.status =
        refund.amount === paymentIntent.amount_received
          ? "refunded"
          : "partially_refunded";
      await order.save();
      res.json({ status: order.status });
    } else {
      res
        .status(400)
        .json({ error: "Refund failed", refundStatus: refund.status });
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: "Failed to process refund" });
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

async function handlePaymentIntentSucceeded(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  const order = await Order.findById(orderId);
  if (order) {
    order.status = "paid";
    order.paymentStatus = "received";
    order.paymentIntentId = paymentIntent.id;
    await order.save();
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  const order = await Order.findById(orderId);
  if (order) {
    order.status = "payment_failed";
    order.paymentStatus = "failed";
    await order.save();
  }
}
