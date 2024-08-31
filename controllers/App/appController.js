const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const PlantCategory = require("../../models/PlantCategory.models");
// const { getPlantInfo } = require("../../utils/PlantsApiService");
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
    const product = await Product.findById(productId).populate("seller");
    res
      .status(200)
      .json(new ApiResponse(200, product, "product recived successfully"));
  } catch (error) {
    throw new ApiError(400, "something went wrong");
  }
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
  const { productId } = req.body;
  const userId = req.user._id;
  // Fetch the product details
  const product = await Product.findOne({ _id: productId });
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
