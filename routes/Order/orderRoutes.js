const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/Order/orderController");

router
  .post("/orders/place", orderController.placeOrder)
  .post("/orders/update-status", orderController.updateOrderStatus)
  .get("/orders/:userId", orderController.getUserOrders);

exports.router = router;
