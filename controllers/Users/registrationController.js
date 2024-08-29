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
    throw new ApiError(400, "All fields are required", {
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

  const roleObject = await Role.findOne({ id: 3 });
  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  if (user.role._id.toString() !== roleObject._id.toString()) {
    throw new ApiError(401, "User not authorized");
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

//getting details of users
exports.getuser = asyncHandler(async (req, res) => {
  const user = req.user;
  console.log("user", user);

  const foundUser = await User.findOne({ _id: user._id })
    .populate("role")
    .populate("buyer")
    .select("-password -refreshToken");

  if (!foundUser) {
    throw new ApiError(400, "User not found");
  }
  res.status(200).json(new ApiResponse(200, foundUser));
});

//user update
exports.editUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    firstName,
    lastName,
    address,
    base64Image,
    countryId,
    stateCode,
    city,
    zipCode,
    phoneNumber,
    location,
  } = req.body;

  // Handle Image upload
  let fileData = {};
  if (base64Image) {
    const base64Data = base64Image.replace(/^data:image\/(.*)base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const imagesDir = path.join(__dirname, "images");
    const tempFilePath = path.join(imagesDir, "tempImage.png");

    // Ensure the images directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    await writeFileAsync(tempFilePath, buffer);

    try {
      const uploadedFile = await uploadOnCloudinary(tempFilePath);
      if (!uploadedFile) {
        res.status(500);
        throw new ApiError(500, "Image could not be uploaded");
      }
      fileData = {
        fileName: "tempImage.png",
        filePath: uploadedFile.secure_url,
        fileType: "image/png",
        fileSize: buffer.length,
      };

      // Check if the file exists before attempting to delete it
      if (await fsExistsAsync(tempFilePath)) {
        await unlinkAsync(tempFilePath);
      }
    } catch (error) {
      // Check if the file exists before attempting to delete it
      if (await fsExistsAsync(tempFilePath)) {
        await unlinkAsync(tempFilePath);
      }
      res.status(500);
      throw new ApiError(500, "Image could not be uploaded");
    }
  }

  // Update User details
  const user = await User.findByIdAndUpdate(
    userId,
    {
      userName: firstName + " " + lastName,
      location: location || req.user.location,
      photo: Object.keys(fileData).length === 0 ? req.user.photo : fileData,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // Create a buyer if the user doesn't have any buyers
  if (user.buyer.length === 0) {
    const buyer = new Buyer({
      user: userId,
      firstName,
      lastName,
      address,
      countryId,
      stateCode,
      city,
      zipCode,
      phoneNumber,
    });
    await buyer.save();
    user.buyer.push(buyer._id);
    await user.save();
  }

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile updated successfully"));
});
//edit and create buyer
exports.editBuyer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    buyerId,
    firstName,
    lastName,
    address,
    countryId,
    stateCode,
    city,
    zipCode,
    phoneNumber,
  } = req.body;

  const user = await User.findById(userId);

  // Check if the user already has the maximum number of buyers (e.g., 3)
  if (user.buyer.length >= 3 && !buyerId) {
    return res
      .status(400)
      .json(new ApiError(400, "Maximum number of buyers reached"));
  }

  let buyer;
  if (buyerId) {
    // Update existing buyer
    buyer = await Buyer.findOneAndUpdate(
      { _id: buyerId, user: userId },
      {
        firstName,
        lastName,
        address,
        countryId,
        stateCode,
        city,
        zipCode,
        phoneNumber,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  } else {
    // Create new buyer
    buyer = new Buyer({
      user: userId,
      firstName,
      lastName,
      address,
      countryId,
      stateCode,
      city,
      zipCode,
      phoneNumber,
    });
    await buyer.save();

    // Add buyer ID to user
    user.buyer.push(buyer._id);
    await user.save();
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, { buyer }, "Buyer profile updated successfully")
    );
});

//delte buyer
exports.deleteBuyer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { buyerId } = req.body;

  // Find the buyer and ensure it belongs to the user
  const buyer = await Buyer.findOne({ _id: buyerId, user: userId });
  if (!buyer) {
    return res.status(404).json(new ApiError(404, "Buyer not found"));
  }

  // Remove the buyer
  await Buyer.findByIdAndDelete(buyerId);

  // Remove the buyer ID from the user's buyer array
  await User.findByIdAndUpdate(userId, {
    $pull: { buyer: buyerId },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Buyer deleted successfully"));
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { userId, productId, sellerId, quantity } = req.body;

  // Validate quantity (only if not a wishlist item)
  if (quantity <= 0) {
    return res
      .status(400)
      .send({ error: "Quantity must be greater than zero" });
  }

  // Fetch the product details to get the price
  const product = await Product.findOne({ _id: productId, user: sellerId });
  if (!product) {
    throw new ApiError(404, "Product not found for this seller");
  }

  // Check if the requested quantity exceeds available stock
  if (quantity > product.quantity) {
    throw new ApiError(400, "Requested quantity exceeds available stock");
  }

  const productPrice = product.price;

  let cart = await Cart.findOne({ userId });

  if (cart) {
    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId && !item.isWishList
    );
    if (itemIndex > -1) {
      // Update the quantity and recalculate the total price
      const newQuantity = quantity;
      if (newQuantity > product.quantity) {
        throw new ApiError(400, "Requested quantity exceeds available stock");
      }
      cart.products[itemIndex].quantity = newQuantity;
      cart.products[itemIndex].price = newQuantity * productPrice;
    } else {
      cart.products.push({
        productId,
        quantity,
        price: quantity * productPrice,
        isWishList: false,
      });
    }
  } else {
    cart = new Cart({
      userId,
      products: [
        {
          productId,
          quantity,
          price: quantity * productPrice,
          isWishList: false,
        },
      ],
    });
  }

  await cart.save();
  res.status(200).json(new ApiResponse(200, cart, "cart added successfully"));
});

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select: "name price description",
  });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Filter out wishlist items
  const cartItems = cart.products.filter((item) => !item.isWishList);
  res
    .status(200)
    .json(
      new ApiResponse(200, { isSuccess: true, cart: cartItems }, "cart list")
    );
});

exports.editCart = asyncHandler(async (req, res) => {
  const { userId, productId, quantity } = req.body;

  // Validate quantity
  if (quantity <= 0) {
    throw new ApiError(404, "Quantity must be greater than zero");
  }

  let cart = await Cart.findOne({ userId });

  if (cart) {
    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId && !item.isWishList
    );
    if (itemIndex > -1) {
      // Update quantity and recalculate price
      cart.products[itemIndex].quantity = quantity;
      const product = await Product.findById(productId);
      if (product) {
        cart.products[itemIndex].price = quantity * product.price;
      } else {
        throw new ApiError(404, "Product not found");
      }
    } else {
      throw new ApiError(404, "Item not found in cart");
    }
  } else {
    throw new ApiError(404, "Cart not found");
  }

  await cart.save();
  res
    .status(200)
    .json(new ApiResponse(200, { isSuccess: true, cart }, "cart edited "));
});

exports.removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body;

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new ApiError(404, "cart not found");
  }

  const itemIndex = cart.products.findIndex(
    (item) => item.productId.toString() === productId && !item.isWishList
  );

  if (itemIndex > -1) {
    cart.products.splice(itemIndex, 1); // Remove the item
    await cart.save();
    res
      .status(200)
      .json(
        new ApiResponse(200, { isSuccess: true }, "Product removed from cart")
      );
  } else {
    throw new ApiError(404, "Product not found in cart");
  }
});

exports.addToWishlist = asyncHandler(async (req, res) => {
  const { userId, productId, sellerId } = req.body;

  // Fetch the product details
  const product = await Product.findOne({ _id: productId, user: sellerId });
  if (!product) {
    throw new ApiError(404, "Product not found for this seller");
  }

  let cart = await Cart.findOne({ userId });

  if (cart) {
    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId && item.isWishList
    );
    if (itemIndex === -1) {
      // Add to wishlist
      cart.products.push({
        productId,
        isWishList: true,
      });
    } else {
      // Item already in wishlist
      throw new ApiError(404, "Item already in wishlist");
    }
  } else {
    cart = new Cart({
      userId,
      products: [{ productId, isWishList: true }],
    });
  }

  await cart.save();
  res.status(200).json(new ApiResponse(200, cart, "added on whishlist"));
});

exports.getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne(
    { userId },
    { products: { $elemMatch: { isWishList: true } } }
  ).populate("products.productId");

  if (!cart || cart.products.length === 0) {
    throw new ApiError(404, "No items found in wishlist");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSuccess: true, wishlist: cart.products },
        "wishlist"
      )
    );
});

exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body;
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new ApiError(404, "cart not found");
  }

  const itemIndex = cart.products.findIndex(
    (item) => item.productId.toString() === productId && item.isWishList
  );

  if (itemIndex > -1) {
    cart.products.splice(itemIndex, 1); // Remove the item
    await cart.save();
    res
      .status(200)
      .json(new ApiResponse(200, { isSuccess: true }, "wishlist removed"));
  } else {
    throw new ApiError(404, "Product not found in wishlist");
  }
});

// exports.placeOrder = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { userId, sellerlId, paymentType , productId} = req.body;

//     // Fetch the cart for the user and hospital
//     const cart = await Cart.findOne({ userId, sellerlId }).session(session);
//     if (!cart || cart.items.length === 0) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(400).send({ error: 'Cart is empty' });
//     }

//     // Calculate the total amount
//     const totalAmount = cart.items.reduce((acc, item) => acc + item.price, 0);

//     // Create a new order
//     const order = new Order({
//         userId,
//         sellerlId,
//         totalAmount,
//         status: 'pending',
//         paymentType,
//         paymentStatus: paymentType === 'Online' ? 'received' : 'pending',
//         orderDate: new Date()
//     });

//     await order.save({ session });

//     // Create purchased items and update medicine quantity
//     for (const item of cart.items) {
//         await new Purchased({
//             orderId: order._id,
//             productId: item.productId,
//             sellerlId,
//             quantity: item.quantity,
//             price: item.price
//         }).save({ session });

//         // Decrease the quantity of the medicine
//         const product = await Product.findById(item.productId).session(session);
//         if (product) {
//             if (product.quantity < item.quantity) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).send({ error: `Insufficient quantity for medicine: ${product.name}` });
//             }
//             product.quantity -= item.quantity;
//             await product.save({ session });
//         }
//     }

//     // Clear the cart
//     await Cart.findByIdAndDelete(cart._id).session(session);

//     await session.commitTransaction();
//     session.endSession();

//     res.status(200).send({ isSuccess: true, order });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error(error);
//     res.status(500).send({ isSuccess: false, message: "Server Error" });
//   }
// };

//Blog
exports.createBlog = asyncHandler(async (req, res) => {
  try {
    const { title, content, base64Image } = req.body;
    let fileData = {};

    // Handle Image upload
    if (base64Image) {
      const base64Data = base64Image.replace(/^data:image\/(.*)base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const imagesDir = path.join(__dirname, "images");
      const tempFilePath = path.join(imagesDir, "tempImage.png");

      // Ensure the images directory exists
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
      }

      await writeFileAsync(tempFilePath, buffer);

      try {
        const uploadedFile = await uploadOnCloudinary(tempFilePath);
        if (!uploadedFile) {
          res.status(500);
          throw new ApiError(500, "Image could not be uploaded");
        }
        fileData = {
          fileName: "tempImage.png",
          filePath: uploadedFile.secure_url,
          fileType: "image/png",
          fileSize: buffer.length,
        };

        // Check if the file exists before attempting to delete it
        if (await fsExistsAsync(tempFilePath)) {
          await unlinkAsync(tempFilePath);
        }
      } catch (error) {
        // Check if the file exists before attempting to delete it
        if (await fsExistsAsync(tempFilePath)) {
          await unlinkAsync(tempFilePath);
        }
        res.status(500);
        throw new ApiError(500, "Image could not be uploaded");
      }
    }

    const blog = new Blog({
      title,
      content,
      author: req.user._id,
      image: fileData,
    });
    await blog.save();
    res.status(201).json(new ApiResponse(201, blog));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

exports.getBlog = asyncHandler(async (req, res) => {
  try {
    const blogs = await Blog.find().populate("author", "userName");
    res.status(200).json(new ApiResponse(200, blogs));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

exports.likeBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json(new ApiError(404, "Blog not found"));
    }
    const userIndex = blog.likes.indexOf(req.user._id);
    if (userIndex === -1) {
      // Like the blog
      blog.likes.push(req.user._id);
      blog.likeCount += 1;
      req.user.likedBlogs.push(blog._id);
    } else {
      // Unlike the blog
      blog.likes.splice(userIndex, 1);
      blog.likeCount -= 1;
      const likedBlogIndex = req.user.likedBlogs.indexOf(blog._id);
      req.user.likedBlogs.splice(likedBlogIndex, 1);
    }
    await blog.save();
    await req.user.save();
    res.status(200).json(new ApiResponse(200, blog));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});
exports.saveBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json(new ApiError(404, "Blog not found"));
    }
    const userIndex = req.user.savedBlogs.indexOf(blog._id);
    if (userIndex === -1) {
      // Save the blog
      req.user.savedBlogs.push(blog._id);
    } else {
      // Unsave the blog
      req.user.savedBlogs.splice(userIndex, 1);
    }
    await req.user.save();
    res.status(200).json(new ApiResponse(200, blog));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});
