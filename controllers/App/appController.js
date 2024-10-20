const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const PlantCategory = require("../../models/PlantCategory.models");
const User = require("../../models/User.models");
const Product = require("../../models/Product.models");
const Shop = require("../../models/Shop.models");
const Cart = require("../../models/Cart.models");
const Buyer = require("../../models/Buyer.models");
const Blog = require("../../models/Blog.models");
const { uploadOnCloudinary } = require("../../utils/cloudinary");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const identifyPlantByImage = require("../../utils/identifyPlantByImage");
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const fsExistsAsync = promisify(fs.exists);

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await PlantCategory.find();
  // .populate({
  //   path: "subcategories",
  //   model: "PlantSubCategory",
  // });
  res
    .status(200)
    .json(
      new ApiResponse(200, categories, "Categories retrieved successfully")
    );
});

exports.getSubCategories = asyncHandler(async (req, res) => {
  const { parentCategoryId } = req.params;

  // Check if parent category exists
  const parentCategory = await PlantCategory.findById(
    parentCategoryId
  ).populate("subcategories");
  if (!parentCategory) {
    throw new ApiError(404, "Parent category not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        parentCategory.subcategories,
        "Subcategories retrieved successfully"
      )
    );
});

// Get all Products and pagination for sepecific category .. here category refer to isfeature , trending and nearby

exports.getProducts = asyncHandler(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      location,
      distance = 5000,
      category,
      productType = "Plant",
    } = req.query;

    // Pagination
    const skip = (page - 1) * limit;

    // Filters
    let trendingProducts, onSaleProducts, isFeaturedProducts, nearbyProducts;

    if (!category || category === "all") {
      trendingProducts = await Product.find({ isTrending: true, productType })
        .skip(skip)
        .limit(limit)
        .sort("-createdAt")
        .populate("categories");

      onSaleProducts = await Product.find({ isOnSale: true, productType })
        .skip(skip)
        .limit(limit)
        .sort("-createdAt")
        .populate("categories");

      isFeaturedProducts = await Product.find({ isFeatured: true, productType })
        .skip(skip)
        .limit(limit)
        .sort("-createdAt")
        .populate("categories");

      if (location) {
        const [longitude, latitude] = location.split(",");
        const nearbyShops = await Shop.find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
              },
              $maxDistance: parseFloat(distance),
            },
          },
        }).select("_id");

        nearbyProducts = await Product.find({
          seller: { $in: nearbyShops.map((shop) => shop._id) },
          productType,
        })
          .skip(skip)
          .limit(limit)
          .sort("-createdAt");
      } else {
        nearbyProducts = await Product.find()
          .skip(skip)
          .limit(limit)
          .sort("-createdAt");
      }
    } else {
      switch (category) {
        case "trending":
          trendingProducts = await Product.find({
            isTrending: true,
            productType,
          })
            .skip(skip)
            .limit(limit)
            .sort("-createdAt")
            .populate("categories");
          break;
        case "onSale":
          onSaleProducts = await Product.find({ isOnSale: true, productType })
            .skip(skip)
            .limit(limit)
            .sort("-createdAt")
            .populate("categories");
          break;
        case "featured":
          isFeaturedProducts = await Product.find({
            isFeatured: true,
            productType,
          })
            .skip(skip)
            .limit(limit)
            .sort("-createdAt")
            .populate("categories");
          break;
        case "nearby":
          if (location) {
            const [longitude, latitude] = location.split(",");
            const nearbyShops = await Shop.find({
              location: {
                $near: {
                  $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                  },
                  $maxDistance: parseFloat(distance),
                },
              },
            }).select("_id");

            nearbyProducts = await Product.find({
              seller: { $in: nearbyShops.map((shop) => shop._id) },
              productType,
            })
              .skip(skip)
              .limit(limit)
              .sort("-createdAt");
          } else {
            nearbyProducts = await Product.find()
              .skip(skip)
              .limit(limit)
              .sort("-createdAt");
          }
          break;
      }
    }

    const [trending, onSale, featured, nearby] = await Promise.all([
      trendingProducts,
      onSaleProducts,
      isFeaturedProducts,
      nearbyProducts,
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          trending: trending ? trending : [],
          onSale: onSale ? onSale : [],
          featured: featured ? featured : [],
          // nearby: nearby ? nearby : [],
        },
        "Fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, "Failed to fetch products", [error.message]);
  }
});

exports.getProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    // console.log("productId", productId);

    const product = await Product.findById(productId).populate("seller");
    res
      .status(200)
      .json(new ApiResponse(200, product, "product recived successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "something went wrong", error);
  }
});

//getting details of users
exports.getuser = asyncHandler(async (req, res) => {
  const user = req.user;
  // console.log("user", user);

  const foundUser = await User.findOne({ _id: user._id })
    // .populate("role")
    // .populate("buyer")
    .select(
      "-password -refreshToken  -otpVerificationCode -otpCodeExpiration -isLoggedIn -isPhoneVerified -isEmailVerified -oauthId -location  -buyer -shop -role"
    );

  if (!foundUser) {
    throw new ApiError(400, "User not found");
  }
  res.status(200).json(new ApiResponse(200, foundUser));
});
//update location

// In your controller file
exports.updateLocation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and Longitude are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(new ApiResponse(200, updatedUser));
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
  const userDetails = await User.findById(req.user._id)
    // .populate("role")
    // .populate("buyer")
    .select(
      "-password -refreshToken -savedBlogs -otpVerificationCode -otpCodeExpiration -isLoggedIn -isPhoneVerified -isEmailVerified -oauthId -location -likedBlogs -buyer -shop -role"
    );
  res
    .status(200)
    .json(
      new ApiResponse(200, { userDetails }, "User profile updated successfully")
    );
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
    .json(new ApiResponse(200, buyerId, "Buyer deleted successfully"));
});

//getting details of buyers
exports.getbuyers = asyncHandler(async (req, res) => {
  const user = req.user;
  // console.log("user", user);

  const foundUser = await Buyer.find({ user: user._id });

  if (!foundUser) {
    throw new ApiError(400, "User not found");
  }
  res.status(200).json(new ApiResponse(200, foundUser));
});

//cart
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user._id;

  // Validate quantity (only if not a wishlist item)
  if (quantity <= 0) {
    return res
      .status(400)
      .send({ error: "Quantity must be greater than zero" });
  }

  // Fetch the product details to get the price
  const product = await Product.findOne({ _id: productId });
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

  // Find the specific product in the cart
  const updatedCart = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select: "name price description image",
  });

  if (!updatedCart) {
    throw new ApiError(404, "Cart not found");
  }

  const addedProduct = updatedCart.products.find(
    (item) => item.productId._id.toString() === productId && !item.isWishList
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSuccess: true, cart: addedProduct },
        "Product added to cart successfully"
      )
    );
});

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select: "name price description image",
  });

  if (!cart) {
    // Return an empty cart array instead of throwing an error
    return res
      .status(200)
      .json(new ApiResponse(200, { isSuccess: true, cart: [] }, "cart list"));
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
  const userId = req.user._id;
  const { productId, quantity } = req.body;

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
    throw new ApiError(404, "Cart not found");
  }

  const itemIndex = cart.products.findIndex(
    (item) => item.productId.toString() === productId && !item.isWishList
  );

  if (itemIndex > -1) {
    cart.products.splice(itemIndex, 1); // Remove the item

    if (cart.products.length === 0) {
      // If cart is empty, remove the cart
      await Cart.deleteOne({ _id: cart._id });
      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isSuccess: true },
            "Product removed and cart deleted"
          )
        );
    } else {
      // Otherwise, just save the updated cart
      await cart.save();
      res
        .status(200)
        .json(
          new ApiResponse(200, { isSuccess: true }, "Product removed from cart")
        );
    }
  } else {
    throw new ApiError(404, "Product not found in cart");
  }
});
//wishlist
exports.addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;
  // Fetch the product details
  const product = await Product.findOne({ _id: productId });
  if (!product) {
    throw new ApiError(404, "Product not found");
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

  const cartList = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select: "name price description image",
  });
  if (!cartList) {
    throw new ApiError(404, "wishlist not found");
  }

  // Filter out wishlist items
  // const cartItems = cartList.products.filter((item) => item.isWishList);
  const cartItems = cartList.products.find(
    (item) => item.productId._id.toString() === productId && item.isWishList
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSuccess: true, wishlist: cartItems },
        "added on whishlist"
      )
    );
});

exports.getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select: "name price description image",
  });

  if (!cart) {
    // Return an empty cart array instead of throwing an error
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isSuccess: true, wishlist: [] }, "wishlist list")
      );
  }
  // Filter out wishlist items
  const cartItems = cart.products.filter((item) => item.isWishList);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSuccess: true, wishlist: cartItems },
        "wish list"
      )
    );
});

exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body;
  let cart = await Cart.findOne({ userId });
  // console.log("userId", userId);
  // console.log("productId", productId);
  if (!cart) {
    throw new ApiError(404, "wishlist not found");
  }

  const itemIndex = cart.products.findIndex(
    (item) => item.productId.toString() === productId && item.isWishList
  );
  if (itemIndex > -1) {
    cart.products.splice(itemIndex, 1); // Remove the item

    if (cart.products.length === 0) {
      // If cart is empty, remove the cart
      await Cart.deleteOne({ _id: cart._id });
      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isSuccess: true },
            "Product removed and wishlist deleted"
          )
        );
    } else {
      // Otherwise, just save the updated cart
      await cart.save();
      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isSuccess: true },
            "Product removed from wishlist"
          )
        );
    }
  } else {
    throw new ApiError(404, "Product not found in wishlist");
  }
});

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
        // console.log("error", error);
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
    // Populate the author field with userName
    const populatedBlog = await Blog.findById(blog._id)
      .populate("author", "userName")
      .exec();
    res.status(201).json(new ApiResponse(201, populatedBlog));
  } catch (error) {
    // console.log("error", error);
    res.status(500).json(new ApiError(500, error.message));
  }
});

exports.getBlogs = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    // Pagination
    const skip = (page - 1) * limit;
    const blogs = await Blog.find()
      .populate("author", "userName")
      .skip(skip)
      .limit(limit)
      .select(" -content");

    // Add liked and saved status
    const blogsWithStatus = blogs.map((blog) => ({
      ...blog.toObject(),
      isLiked: blog.likes.includes(userId),
      isSaved: req.user.savedBlogs.includes(blog._id),
    }));
    res.status(200).json(new ApiResponse(200, blogsWithStatus));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

exports.getBlog = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const blog = await Blog.findById(id).populate("author", "userName");

    const blogWithStatus = {
      ...blog.toObject(),
      isLiked: blog.likes.includes(userId),
      isSaved: req.user.savedBlogs.includes(blog._id),
    };
    res.status(200).json(new ApiResponse(200, blogWithStatus));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

//get user blog

exports.getBlogOfUser = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Pagination
    const skip = (page - 1) * limit;
    const blogs = await Blog.find({ author: userId })
      .populate("author", "userName")
      .skip(skip)
      .limit(limit)
      .select("-content");

    // Add liked and saved status
    const blogsWithStatus = blogs.map((blog) => ({
      ...blog.toObject(),
      isLiked: blog.likes.includes(userId),
      isSaved: req.user.savedBlogs.includes(blog._id),
    }));

    res.status(200).json(new ApiResponse(200, blogsWithStatus));
  } catch (error) {
    res.status(500).json(new ApiError(500, `Server Error: ${error.message}`));
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

// Get Liked Blogs
exports.getLikedBlogs = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("likedBlogs");
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    res.status(200).json(new ApiResponse(200, user.likedBlogs));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

// Get Saved Blogs
exports.getSavedBlogs = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedBlogs",
      populate: { path: "author", select: "userName" },
    });

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const blogWithStatus = user.savedBlogs.map((blog) => {
      const isLiked = blog.likes
        .map((id) => id.toString())
        .includes(req.user._id.toString());
      const isSaved = true;

      // console.log(
      //   `Blog ID: ${blog._id}, isLiked: ${isLiked}, isSaved: ${isSaved}`
      // );

      return {
        ...blog.toObject(),
        isLiked,
        isSaved,
      };
    });

    // console.log("blogWithStatus", blogWithStatus);
    res.status(200).json(new ApiResponse(200, blogWithStatus));
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
});

//search
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};
const createFlexibleRegex = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escapedName.split(/\s+/).join(".*"), "i");
};

//search by query or image
exports.searchProducts = asyncHandler(async (req, res) => {
  const { query, imageBase64, page = 1, limit = 10 } = req.body;
  const skip = (page - 1) * limit;

  if (!query && !imageBase64) {
    return res.status(400).json({ message: "Query or image is required" });
  }

  // Helper function for fuzzy matching
  const fuzzyMatch = (searchTerm, productName) => {
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    const productWords = productName.toLowerCase().split(/\s+/);

    return searchWords.every((searchWord) =>
      productWords.some(
        (productWord) =>
          levenshteinDistance(searchWord, productWord) <=
          Math.floor(searchWord.length * 0.3)
      )
    );
  };

  let products = [];
  let totalProducts = 0;
  let message = null;

  // Step 1: Handle Image Search
  if (imageBase64) {
    try {
      const plantDetails = await identifyPlantByImage(imageBase64);
      const plantSuggestions = plantDetails.results || [];

      if (plantSuggestions.length > 0) {
        const commonNames = plantSuggestions.flatMap(
          (s) => s.species.commonNames || []
        );

        const commonNameRegexes = commonNames.map(createFlexibleRegex);

        totalProducts = await Product.countDocuments({
          name: { $in: commonNameRegexes },
        });

        products = await Product.find({
          name: { $in: commonNameRegexes },
        })
          .skip(skip)
          .limit(limit);

        if (products.length === 0) {
          message = `No products found for common names: ${commonNames.join(
            ", "
          )}`;
        }
      } else {
        message = "No common names identified from image";
      }
    } catch (error) {
      return res
        .status(404)
        .json({ message: "Error identifying plant by image" });
    }
  } else {
    // Step 2: Handle Text-based Search
    const searchQuery = query.trim().toLowerCase();
    console.log("searchQuery", searchQuery);
    // Create a case-insensitive regex for the search query
    const searchRegex = new RegExp(searchQuery.split(/\s+/).join("|"), "i");
    console.log("searchRegex", searchRegex);
    // Find products that match the regex
    const matchedProducts = await Product.find({ name: searchRegex });
    console.log("matchedProducts", matchedProducts);
    // Apply fuzzy matching to the results
    const fuzzyMatchedProducts = matchedProducts.filter((product) =>
      fuzzyMatch(searchQuery, product.name)
    );
    console.log("fuzzyMatchedProducts", fuzzyMatchedProducts);
    totalProducts = fuzzyMatchedProducts.length;
    products = fuzzyMatchedProducts.slice(skip, skip + limit);
    console.log("products", products);
    if (products.length === 0) {
      message = "No products found matching the search query";
    }
  }

  const totalPages = Math.ceil(totalProducts / limit);
  const hasMore = page < totalPages;

  return res.status(200).json({
    products,
    page,
    totalPages,
    hasMore,
    totalProducts,
    message,
  });
});

//shops
exports.getShops = asyncHandler(async (req, res) => {
  let { location, page = 1, limit = 10, maxDistance = 5000 } = req.query;
  // console.log("body", req.query);

  // Parse the query parameters as integers
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  maxDistance = parseInt(maxDistance, 10);

  let shops;

  if (location) {
    const coordinates = JSON.parse(location).coordinates;
    shops = await Shop.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: coordinates },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      { $sort: { distance: 1 } }, // Sort by distance
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    // If no shops found within maxDistance, fetch nearby shops without distance constraint
    if (!shops || shops.length === 0) {
      shops = await Shop.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: coordinates },
            distanceField: "distance",
            spherical: true,
          },
        },
        { $sort: { distance: 1 } }, // Sort by distance
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]);
    }
  } else {
    shops = await Shop.find()
      .skip((page - 1) * limit)
      .limit(limit);
  }

  if (!shops || shops.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No more shops"));
  }

  // console.log("shops", shops);
  return res.status(200).json(new ApiResponse(200, shops, "Shop list fetched"));
});

exports.getShopProducts = asyncHandler(async (req, res) => {
  // const { id } = req.params;
  let { id, page = 1, limit = 10 } = req.query;
  // console.log("req.query", req.query);

  // Parse the query parameters as integers
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const products = await Product.find({ seller: id })
    .skip((page - 1) * limit)
    .limit(limit);
  if (!products || products.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No more products"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products list fetched shop wise"));
});
