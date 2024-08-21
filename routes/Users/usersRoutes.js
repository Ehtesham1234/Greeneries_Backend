const express = require("express");
const userController = require("../../controllers/Users/registrationController");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");
// const { upload } = require("../../middleware/multer.middleware");

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
  .post("/purchase", verifyUser, userController.purchase);

exports.router = router;
