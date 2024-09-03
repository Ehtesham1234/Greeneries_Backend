const User = require("../../models/User.models");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const Role = require("../../models/roles/roles.models");
const Product = require("../../models/Product.models");
const Shop = require("../../models/Shop.models");
const Cart = require("../../models/Cart.models");
const Buyer = require("../../models/Buyer.models");
const Blog = require("../../models/Blog.models");
const jwt = require("jsonwebtoken");
const { sendOtp } = require("../../utils/fileUploads");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const { uploadOnCloudinary } = require("../../utils/cloudinary");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const fsExistsAsync = promisify(fs.exists);

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

exports.userRegistration = asyncHandler(async (req, res, nex) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation Error", errors.array());
  }
  const { userName, phoneNumber, email, password } = req.body;
  // console.log("req.body", req.body);
  if (!userName) {
    throw new ApiError(400, "Validation Error", ["name is required"]);
  }
  if (!phoneNumber && !email) {
    throw new ApiError(400, "Validation Error", [
      "phonenumber or email is required",
    ]);
  }
  //checking if password is valid
  if (!password || password.length < 6) {
    throw new ApiError(
      400,
      "password is invalid it should be six or more than six digits"
    );
  }
  // Check if user already exists
  let existingUser;
  if (email) {
    existingUser = await User.findOne({ email });
  } else if (phoneNumber) {
    existingUser = await User.findOne({ phoneNumber });
  }
  if (existingUser) {
    if (
      (email && !existingUser.isEmailVerified) ||
      (phoneNumber && !existingUser.isPhoneVerified)
    ) {
      // Generate OTP and expiry time
      const otp = crypto.randomBytes(3).toString("hex");
      const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes

      // Save user to database with status unverified
      existingUser.otpVerificationCode = otp;
      existingUser.otpCodeExpiration = otpExpiry;

      if (email) {
        existingUser.isEmailVerified = false;
      } else if (phoneNumber) {
        existingUser.isPhoneVerified = false;
      }

      await existingUser.save();

      // Send OTP for verification
      sendOtp(phoneNumber || email, otp);
      const createdUser = await User.findById(existingUser._id).select(
        "-password -refreshToken"
      );

      if (!createdUser) {
        throw new ApiError(
          500,
          "Something went wrong while registering the user"
        );
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { user: createdUser },
            "User not verified OTP sent for verification"
          )
        );
    } else {
      return res
        .status(200)
        .json(new ApiResponse(200, "User already exists ,Please Sign In"));
    }
  }

  const roleObject = await Role.findOne({ id: 3 });
  console.log("roleObject", roleObject);

  // Generate OTP and expiry time
  const otp = crypto.randomBytes(3).toString("hex");
  const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes

  // Save user to database with status unverified
  const user = new User({
    userName,
    phoneNumber,
    email,
    password,
    role: roleObject._id,
    otpVerificationCode: otp,
    otpCodeExpiration: otpExpiry,
  });

  if (email) {
    user.isEmailVerified = false;
  } else if (phoneNumber) {
    user.isPhoneVerified = false;
  }
  await user.save();

  // Send OTP for verification
  sendOtp(phoneNumber || email, otp);
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, { user: createdUser }, "OTP sent for verification")
    );
});

exports.userVerification = asyncHandler(async (req, res, next) => {
  const { phoneNumber, email, otpVerificationCode } = req.body;
  const roleObject = await Role.findOne({ id: 3 });
  console.log("roleObject", roleObject);
  // Fetch user details
  let user;
  if (email) {
    user = await User.findOne({ email });
  } else if (phoneNumber) {
    user = await User.findOne({ phoneNumber });
  }

  // Check if user exists
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  // Check if user autherized
  if (user.role.toString() != roleObject._id.toString()) {
    throw new ApiError(400, "User not autherized");
  }

  // Check OTP expiry
  if (Date.now() > user.otpCodeExpiration) {
    throw new ApiError(400, "OTP expired");
  }

  // Verify OTP
  if (otpVerificationCode !== user.otpVerificationCode) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (email) {
    user.isEmailVerified = true;
  } else if (phoneNumber) {
    user.isPhoneVerified = true;
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  user.isLoggedIn = true;
  user.otpCodeExpiration = null;
  user.otpVerificationCode = null;
  user.refreshToken = refreshToken;
  await user.save();

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res.status(201).json(
    new ApiResponse(
      200,
      {
        user: createdUser,
        token: accessToken,
        refreshToken,
      },
      "User verified and logged in successfully "
    )
  );
});

// sign In // role check bhe kerna hai app ka login hai to id 3 user chahiye werna seller login kar lega
exports.userSignIn = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(403, "All fields are required", {
      errors: errors.array(),
    });
  }

  const { phoneNumber, email, password } = req.body;

  // Find the user by their phone or email
  let user;
  if (email) {
    user = await User.findOne({ email }).populate("role");
  } else if (phoneNumber) {
    user = await User.findOne({ phoneNumber }).populate("role");
  }

  if (!user) {
    throw new ApiError(403, "User not found");
  }

  // Check if user is verified
  if (
    (email && !user.isEmailVerified) ||
    (phoneNumber && !user.isPhoneVerified)
  ) {
    // Generate OTP and expiry time
    const otp = crypto.randomBytes(3).toString("hex");
    const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes

    // Save user to database with status unverified
    user.otpVerificationCode = otp;
    user.otpCodeExpiration = otpExpiry;
    if (email) {
      user.isEmailVerified = false;
    } else if (phoneNumber) {
      user.isPhoneVerified = false;
    }

    await user.save();

    // Send OTP for verification
    sendOtp(phoneNumber || email, otp);

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: createdUser },
          "User not verified OTP sent for verification"
        )
      );
  }

  const roleObject = await Role.findOne({ id: 3 });
  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(403, "Invalid user credentials");
  }

  if (user.role._id.toString() !== roleObject._id.toString()) {
    throw new ApiError(403, "User not authorized");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  // Assign refreshToken to user object but do not include it in the response
  user.refreshToken = refreshToken;
  user.isLoggedIn = true;
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -buyer -location -likedBlogs -savedBlogs -shop -isPhoneVerified -isEmailVerified -isActive -otpCodeExpiration -otpVerificationCode"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", { token: accessToken }, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          token: accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

exports.logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
      isLoggedIn: false,
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// Refresh Access Token
exports.refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  console.log("Incoming refresh token:", incomingRefreshToken);

  if (!incomingRefreshToken) {
    return res
      .status(401)
      .send("Unauthorized request: No refresh token provided");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log("Decoded refresh token:", decodedToken);

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res.status(401).send("Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    console.log("New tokens:", { accessToken, refreshToken });

    user.isLoggedIn = true;
    user.refreshToken = refreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", { token: accessToken }, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { token: accessToken, refreshToken: refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).send("Refresh token has expired");
    }
    console.error("Refresh token error:", error);
    return res.status(403).send(`Invalid refresh token: ${error.message}`);
  }
});

//reset Password by phoneNumber
exports.getPasswordResetOtp = asyncHandler(async (req, res, next) => {
  const { phoneNumber, email } = req.body;
  let user;
  if (email) {
    user = await User.findOne({ email }).populate("role");
  } else if (phoneNumber) {
    user = await User.findOne({ phoneNumber }).populate("role");
  }

  if (!user) {
    throw new ApiError(400, "User does not exist please Sign Up");
  }

  // Generate OTP and expiry time
  const otp = crypto.randomBytes(3).toString("hex");
  const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes

  // Save user to database with status unverified
  user.otpVerificationCode = otp;
  user.otpCodeExpiration = otpExpiry;
  await user.save();

  // Send OTP for verification
  sendOtp(phoneNumber || email, otp);

  return res
    .status(201)
    .json(new ApiResponse(200, "Otp Sent to your mobile number"));
});

//verify otp for forget password incomplete for now
exports.verifyOtpPassword = asyncHandler(async (req, res, next) => {
  const { phoneNumber, email, otpVerificationCode } = req.body;
  let user;
  if (email) {
    user = await User.findOne({ email }).populate("role");
  } else if (phoneNumber) {
    user = await User.findOne({ phoneNumber }).populate("role");
  }
  // Check if user exists
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // Check OTP expiry
  if (Date.now() > user.otpCodeExpiration) {
    throw new ApiError(400, "OTP expired");
  }

  // Verify OTP
  if (otpVerificationCode !== user.otpVerificationCode) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.otpCodeExpiration = null;
  user.otpVerificationCode = null;
  await user.save();
  res.status(201).json(new ApiResponse(200, "verified successfully"));
});

//Reset Password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { phoneNumber, email, password } = req.body;
  let user;
  if (email) {
    user = await User.findOne({ email }).populate("role");
  } else if (phoneNumber) {
    user = await User.findOne({ phoneNumber }).populate("role");
  }
  // Check if user exists
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  // Save the new password to user's data
  user.password = password;
  await user.save();

  res.status(201).json(new ApiResponse(200, "Password reset successfully"));
});
