const express = require("express");
const userController = require("../../controllers/Users/registrationController");
const { body } = require("express-validator");
const passport = require("passport");
const router = express.Router();
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");
const { upload } = require("../../middleware/multer.middleware");
const validateItem = [
  body("userName").notEmpty().trim().escape(),
  body("phoneNumber").notEmpty().trim().escape(),
];

// // Google OAuth
// router.get(
//   "/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: "/" }),
//   (req, res) => {
//     res.redirect("/dashboard");
//   }
// );

// // GitHub OAuth
// router.get(
//   "/github",
//   passport.authenticate("github", { scope: ["user:email"] })
// );
// router.get(
//   "/github/callback",
//   passport.authenticate("github", { failureRedirect: "/" }),
//   (req, res) => {
//     res.redirect("/dashboard");
//   }
// );

// // Facebook OAuth
// router.get(
//   "/facebook",
//   passport.authenticate("facebook", { scope: ["email"] })
// );
// router.get(
//   "/facebook/callback",
//   passport.authenticate("facebook", { failureRedirect: "/" }),
//   (req, res) => {
//     res.redirect("/dashboard");
//   }
// );
// Logout route
// router.get("/logout", (req, res) => {
//   req.logout((err) => {
//     if (err) { return next(err); }
//     res.redirect("/");
//   });
// });


// const express = require('express');
// const passport = require('passport');
// const jwt = require('jsonwebtoken');
// const { findOrCreateUser } = require('./userService');
// app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
//   const user = await findOrCreateUser(req.user); // Create user if not exists
//   const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//   res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
// });

// app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), async (req, res) => {
//   const user = await findOrCreateUser(req.user); // Create user if not exists
//   const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//   res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
// });

// app.post('/auth/oauth', async (req, res) => {
//   const { token } = req.body;
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await findUserById(decoded.userId);
//     res.json({ isSuccess: true, user, token });
//   } catch (error) {
//     res.status(401).json({ isSuccess: false, message: 'Invalid token' });
//   }
// });

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
