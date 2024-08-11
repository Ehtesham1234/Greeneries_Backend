const express = require("express");
const passport = require("passport");
require("../../config/passport");
const router = express.Router();
const { ApiError } = require("../../utils/ApiError");
const User = require("../../models/User.models");
//refresh token
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

// Route to start Google OAuth
router.get(
  "/auth/google",
  (req, res, next) => {
    console.log("Starting Google OAuth...");
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Callback route for Google to redirect to
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),

  async (req, res) => {
    console.log("Google OAuth callback triggered...");
    try {
      console.log("Generating tokens for user:", req.user);

      const { accessToken, refreshToken } =
        await generateAccessAndRefereshTokens(req.user._id);

      // Set the tokens in cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      // Redirect to your frontend application
      // res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      console.log("Tokens set in cookies, returning user details...");

      res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user:req.user,
      });
    } catch (error) {
      console.error("Error during OAuth callback:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
exports.router = router;
