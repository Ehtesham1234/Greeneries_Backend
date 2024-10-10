const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/Order/orderController");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");
router
  .post("/orders/place", verifyUser, orderController.placeOrder)
  .get("/orders", verifyUser, orderController.getUserOrders)
  .get("/order/:orderId", verifyUser, orderController.getOrder);

exports.router = router;
