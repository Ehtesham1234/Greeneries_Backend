const express = require("express");
const appController = require("../../controllers/App/appController");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");

router.get(
  "/subcategory/:parentCategoryId",
  verifyUser,
  appController.getSubCategories
);

router.get("/category", verifyUser, appController.getCategories);

router.get("/products" , appController.getProducts)
router.get("/product/:id" , appController.getProduct)

exports.router = router;
