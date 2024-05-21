const express = require("express");
const router = express.Router();
const productController = require("../../controllers/Product/productController");
const { upload } = require("../../middleware/multer.middleware");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyAdmin = verifyToken("admin");

router.post(
  "/product",
  verifyAdmin,
  upload.single("image"),
  productController.createProduct
);
router.patch(
  "/product/:id",
  verifyAdmin,
  upload.single("image"),
  productController.updateProduct
);
router.get("/products", verifyAdmin, productController.getProducts);
router.get("/product/:id", verifyAdmin, productController.getProduct);
router.delete("/product/:id", verifyAdmin, productController.deleteProduct);

exports.router = router;
