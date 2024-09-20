const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/Payment/paymentController");

router
  .post(
    "/payments/create-payment-intent",
    paymentController.createPaymentIntent
  )
  .post("/payments/refund", paymentController.processRefund)
  .post(
    "/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentController.handleWebhook
  );

exports.router = router;
