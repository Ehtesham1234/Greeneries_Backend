const express = require("express");
const appController = require("../../controllers/App/appController");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");

router
  .get(
    "/subcategory/:parentCategoryId",
    verifyUser,
    appController.getSubCategories
  )
  .get("/category", verifyUser, appController.getCategories)
  .get("/products", verifyUser, appController.getProducts)
  .get("/product/:id", verifyUser, appController.getProduct)
  .get("/getuser", verifyUser, appController.getuser)
  .patch("/user", verifyUser, appController.editUser)
  .post("/user/buyer", verifyUser, appController.editBuyer)
  .delete("/user/buyer", verifyUser, appController.deleteBuyer)
  .get("/user/buyer", verifyUser, appController.getbuyers)
  .post("/user/cart/add", verifyUser, appController.addToCart)
  .get("/user/cart", verifyUser, appController.getCart)
  .patch("/user/cart/edit", verifyUser, appController.editCart)
  .post("/user/cart/remove", verifyUser, appController.removeFromCart)
  .post("/user/wishlist/add", verifyUser, appController.addToWishlist)
  .get("/user/wishlist", verifyUser, appController.getWishlist)
  .post("/user/wishlist/remove", verifyUser, appController.removeFromWishlist)
  .post("/blogs", verifyUser, appController.createBlog)
  .get("/blogs", verifyUser, appController.getBlogs)
  .get("/blog/:id", verifyUser, appController.getBlog)
  .get("/blog/user", verifyUser, appController.getBlogOfUser)
  .post("/blogs/:id/like", verifyUser, appController.likeBlog)
  .post("/blogs/:id/save", verifyUser, appController.saveBlog)

  //search
  .post("/product/search", verifyUser, appController.searchProducts);

exports.router = router;
