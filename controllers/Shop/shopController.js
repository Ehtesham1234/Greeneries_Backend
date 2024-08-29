const Shop = require("../../models/Shop.models");
const User = require("../../models/User.models");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const Role = require("../../models/roles/roles.models");
const jwt = require("jsonwebtoken");
const { sendOtp } = require("../../utils/fileUploads");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");

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

exports.shopRegister = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation Error", errors.array());
  }
  try {
    const { userName, phoneNumber, email, password } = req.body;
    console.log("req", req.body);

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

    const roleObject = await Role.findOne({ id: 2 });
    console.log("roleObject", roleObject);

    // Generate OTP and expiry time
    const otp = crypto.randomBytes(3).toString("hex");
    const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes
    console.log("otp", otp);

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
    console.log("user", user);
    if (email) {
      user.isEmailVerified = false;
    }

    if (phoneNumber) {
      user.isPhoneVerified = false;
    }
    await user.save();

    // Send OTP for verification
    sendOtp(phoneNumber || email, otp);
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    console.log("createdUser", createdUser);
    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, { user: createdUser }, "OTP sent for verification")
      );
  } catch (error) {
    throw new ApiError(500, error?.message);
  }
});

//change kerna hai yeh user wala hai
exports.shopVerification = asyncHandler(async (req, res, next) => {
  try {
    const { phoneNumber, email, otpVerificationCode } = req.body;
    const roleObject = await Role.findOne({ id: 2 });
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
    console.log("user.role", user.role);
    console.log("roleObject._id", roleObject._id);
    // Check if user autherized
    if (!user.role.equals(roleObject._id)) {
      throw new ApiError(400, "User not authorized");
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
  } catch (err) {
    throw new ApiError(500, err?.message);
  }
});

exports.shopSignIn = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "All fields are required", {
      errors: errors.array(),
    });
  }
  try {
    const { phoneNumber, email, password } = req.body;

    // Find the user by their phone or email
    let user;
    if (email) {
      user = await User.findOne({ email }).populate("role");
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber }).populate("role");
    }

    if (!user) {
      throw new ApiError(400, "User not found");
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

    const roleObject = await Role.findOne({ id: 2 });
    console.log("roleObject", roleObject);
    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
    }

    if (!user.role.equals(roleObject._id)) {
      throw new ApiError(400, "User not authorized");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );

    user.refreshToken = refreshToken;
    user.isLoggedIn = true;
    await user.save();
    
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
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
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
exports.logoutShop = asyncHandler(async (req, res) => {
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

exports.refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  console.log("incomingRefreshToken", incomingRefreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    console.log("user?.refreshToken", user?.refreshToken);

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    console.log(process.env.REFRESH_TOKEN_SECRET);
    console.log(process.env.ACCESS_TOKEN_SECRET);
    console.log("incomingRefreshToken", incomingRefreshToken);

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    console.log("accessToken, refreshToken", {
      accessToken,
      refreshToken,
    });
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
    throw new ApiError(401, error?.message || "Invalid refresh token");
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

exports.getShopDetails = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    console.log("user", user);

    const foundUser = await User.findOne({ _id: user._id })
      .populate("role")
      .populate({
        path: "shop",
        model: "Shop",
      })
      .select("-password -refreshToken -buyer");

    if (!foundUser) {
      throw new ApiError(400, "User not found");
    }
    res.status(200).json(new ApiResponse(200, foundUser));
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

exports.createSellerProfile = asyncHandler(async (req, res) => {
  const { shopName, shopAddress, shopCity, shopState, shopZipCode, location } =
    req.body;
  try {
    // Check if parent user exists
    const sellerRegistration = await User.findById(req.user._id);
    if (!sellerRegistration) {
      throw new ApiError(404, "user not registered");
    }

    const shop = await Shop.create({
      user: req.user._id,
      shopName,
      shopAddress,
      shopCity,
      shopState,
      shopZipCode,
      location: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
    });
    // Add shop to seller
    sellerRegistration.shop.push(shop._id);
    await sellerRegistration.save();

    res
      .status(201)
      .json(new ApiResponse(201, shop, "Seller profile created successfully"));
  } catch (error) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

exports.updateSellerProfile = asyncHandler(async (req, res) => {
  try {
    const { location, ...updateData } = req.body;
    // Check if parent user exists
    const sellerRegistration = await User.findById(req.user._id);
    if (!sellerRegistration) {
      throw new ApiError(404, "user not registered");
    }
    if (location) {
      updateData.location = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };
    }

    const shop = await Shop.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true }
    );

    if (!shop) {
      throw new ApiError(404, "Seller profile not found");
    }
    // Add shop to seller
    sellerRegistration.shop.push(shop._id);
    await sellerRegistration.save();
    res
      .status(200)
      .json(new ApiResponse(200, shop, "Seller profile updated successfully"));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
});

exports.getSellerProfile = asyncHandler(async (req, res) => {
  try {
    const shop = await Shop.findOne({ user: req.user._id });

    if (!shop) {
      throw new ApiError(404, "Seller profile not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, shop, "Seller profile retrieved successfully")
      );
  } catch (error) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err });
  }
});
