const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/Order/orderController");

router
  .post("/orders/place", orderController.placeOrder)

  .get("/orders/:userId", orderController.getUserOrders);

exports.router = router;
