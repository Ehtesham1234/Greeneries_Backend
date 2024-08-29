const express = require("express");
const userController = require("../../controllers/Users/registrationController");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");

router
  .post("/signup", userController.userRegistration)
  .post("/verification", userController.userVerification)
  .post("/signin", userController.userSignIn)
  .post("/logout", verifyUser, userController.logoutUser)
  .post("/refresh-token", userController.refreshAccessToken)
  .post("/forgetpassword", userController.getPasswordResetOtp)
  .post("/forgetpassword/verifyotp", userController.verifyOtpPassword)
  .post("/forgetpassword/resetpassword", userController.resetPassword)
  .get("/getuser", verifyUser, userController.getuser)
  .patch("/user", verifyUser, userController.editUser)
  .post("/user/buyer", verifyUser, userController.editBuyer)
  .delete("/user/buyer", verifyUser, userController.deleteBuyer)
  .post("/user/cart/add", verifyUser, userController.addToCart)
  .get("/user/cart", verifyUser, userController.getCart)
  .patch("/user/cart/edit", verifyUser, userController.editCart)
  .post("/user/cart/remove", verifyUser, userController.removeFromCart)
  .post("/user/wishlist/add", verifyUser, userController.addToWishlist)
  .get("/user/wishlist", verifyUser, userController.getWishlist)
  .post("/user/wishlist/remove", verifyUser, userController.removeFromWishlist)
  .post("/blogs", verifyUser, userController.createBlog)
  .get("/blogs", verifyUser, userController.getBlog)
  .post("/blogs/:id/like", verifyUser, userController.likeBlog)
  .post("/blogs/:id/save", verifyUser, userController.saveBlog);

exports.router = router;
