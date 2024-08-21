const express = require("express");
const router = express.Router();
const productController = require("../../controllers/Product/productController");
const { upload } = require("../../middleware/multer.middleware");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyAdmin = verifyToken("admin");

router.post(
  "/product",
  verifyAdmin,
  upload.array("images", 5),
  productController.createProduct
);

router.patch(
  "/product/:id",
  verifyAdmin,
  upload.array("images", 5),
  productController.updateProduct
);
router.get("/products", verifyAdmin, productController.getProducts);
router.get("/product/:id", verifyAdmin, productController.getProduct);
router.delete("/product/:id", verifyAdmin, productController.deleteProduct);
router.post(
  "/products/:id/feature",
  verifyAdmin,
  productController.isFeaturedProduct
);
router.post(
  "/products/:id/sale",
  verifyAdmin,
  productController.onSalesProduct
);
// router.get("/:id", productController.getProductById);

//category for product
router.post("/category", verifyAdmin, productController.createCategory);
router.put("/category/:id", verifyAdmin, productController.updateCategory);
router.delete("/category/:id", verifyAdmin, productController.deleteCategory);
router.get("/categories", verifyAdmin, productController.getCategories);

//category for product
router.post("/subcategory", verifyAdmin, productController.createSubCategory);
router.put(
  "/subcategory/:id",
  verifyAdmin,
  productController.updateSubCategory
);
router.delete(
  "/subcategory/:id",
  verifyAdmin,
  productController.deleteSubCategory
);
router.get("/subcategory", productController.getSubCategories);
exports.router = router;
