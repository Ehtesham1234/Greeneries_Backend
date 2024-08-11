const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const UserSchema = new Schema(
  {
    role: { type: ObjectId, ref: "Role" },
    shop: { type: ObjectId, ref: "Shop" },
    buyer: { type: ObjectId, ref: "Buyer" },
    userName: { type: String },
    email: { type: String, trim: true, default: null },
    phoneNumber: { type: String, trim: true, default: null },
    password: { type: String },
    photo: { type: String },
    otpVerificationCode: { type: String, default: null },
    otpCodeExpiration: {
      type: Date,
      default: null,
    },
    isLoggedIn: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Number, default: 1 },
    refreshToken: {
      type: String,
    },
    oauthId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      phoneNumber: this.phoneNumber,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

module.exports = mongoose.model("User", UserSchema);
