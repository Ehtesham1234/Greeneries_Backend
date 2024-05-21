const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const shopController = require("../../controllers/Shop/shopController");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyAdmin = verifyToken("admin");
const { upload } = require("../../middleware/multer.middleware");

router.post("/shop/signup", shopController.shopRegister);
router.post("/shop/verification", shopController.shopVerification);
router.post("/shop/signin", shopController.shopSignIn);
router.post(
  "/shop/forgetpassword",
  verifyAdmin,
  shopController.getPasswordResetOtp
);
router.post(
  "/shop/forgetpassword/verifyotp",
  verifyAdmin,
  shopController.verifyOtpPassword
);
router.post(
  "/shop/forgetpassword/resetpassword",
  verifyAdmin,
  shopController.resetPassword
);
router.get(
  "/shop/getshop/:num",
  verifyAdmin,
  shopController.getShopRegistration
);
router.get("/shops", verifyAdmin, shopController.getShops);
router.patch("/shop/profile", verifyAdmin, shopController.createOrEditProfile);

exports.router = router;
