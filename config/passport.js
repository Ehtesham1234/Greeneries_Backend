const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const User = require("../models/User.models");

const oauthCallback = async (accessToken, refreshToken, profile, done) => {
  try {
    console.log("OAuth Callback triggered with profile:", profile);
    const existingUser = await User.findOne({
      oauthId: profile.id,
    });

    if (existingUser) {
      console.log("User already exists:", existingUser);
      return done(null, existingUser);
    }
    console.log("Creating new user...");
    const newUser = new User({
      oauthId: profile.id,
      // provider: profile.provider,
      userName: profile.displayName || profile.username,
      email: profile.emails[0].value,
      isEmailVerified: true,
      isLoggedIn: true,
      photo: profile.photos[0].value,
      refreshToken,
    });

    await newUser.save();
    console.log("New user created:", newUser);
    done(null, newUser);
  } catch (err) {
    console.error("Error in OAuth callback:", err);

    done(err, null);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/google/auth/google/callback",
    },
    oauthCallback
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user by ID:", id);
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    console.error("Error deserializing user:", err);
    done(err, null);
  }
});

module.exports = passport;
