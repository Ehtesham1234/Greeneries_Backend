const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/Payment/paymentController");

router
  .post("/payments/verify", paymentController.verifyPayment);

exports.router = router;
