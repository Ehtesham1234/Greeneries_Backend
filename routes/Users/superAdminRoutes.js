const express = require("express");
const superAdminController = require("../../controllers/Users/superAdminRegistrationController");
const { body } = require("express-validator");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const { upload } = require("../../middleware/multer.middleware");
const verifySuperAdmin = verifyToken("superadmin");

router
  .post("/superadmin/signup", superAdminController.userRegistration)
  .post("/superadmin/signin", superAdminController.userSignIn)
  .get(
    "/superadmin/get/:num",
    verifySuperAdmin,
    superAdminController.getuserRegistration
  );

exports.router = router;
