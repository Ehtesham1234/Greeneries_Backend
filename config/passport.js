const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const mongoose = require("mongoose");
const User = require("../models/User.models");


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const oauthCallback = async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({
      oauthId: profile.id,
      provider: profile.provider,
    });

    if (existingUser) {
      return done(null, existingUser);
    }

    const newUser = new User({
      oauthId: profile.id,
      provider: profile.provider,
      userName: profile.displayName || profile.username,
      email: profile.emails[0].value,
      isEmailVerified: true,
    });

    await newUser.save();
    done(null, newUser);
  } catch (err) {
    done(err, null);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    oauthCallback
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
    },
    oauthCallback
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "email"],
    },
    oauthCallback
  )
);
