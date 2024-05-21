const express = require("express");
const userController = require("../../controllers/Users/registrationController");
const { body } = require("express-validator");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");
const { upload } = require("../../middleware/multer.middleware");
const validateItem = [
  body("userName").notEmpty().trim().escape(),
  body("phoneNumber").notEmpty().trim().escape(),
];

router
  .post("/signup", userController.userRegistration)
  .post("/verification", userController.userVerification)
  .post("/signin", userController.userSignIn)
  .post("/logout", verifyUser, userController.logoutUser)
  .post("/refresh-token", userController.refreshAccessToken)
  .post("/forgetpassword", verifyUser, userController.getPasswordResetOtp)
  .post(
    "/forgetpassword/verifyotp",
    verifyUser,
    userController.verifyOtpPassword
  )
  .post(
    "/forgetpassword/resetpassword",
    verifyUser,
    userController.resetPassword
  )
  .get("/getuser/:num", verifyUser, userController.getuserRegistration);

exports.router = router;
