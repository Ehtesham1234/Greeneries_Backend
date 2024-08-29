const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const Role = require("../../models/roles/roles.models");
const User = require("../../models/User.models");
const Product = require("../../models/Product.models");
const Shop = require("../../models/Shop.models");
const PlantCategory = require("../../models/PlantCategory.models");
const PlantSubCategory = require("../../models/PlantSubCategories.models");
const { getPlantInfo } = require("../../utils/PlantsApiService");

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await PlantCategory.find().populate({
    path: "subcategories",
    model: "PlantSubCategory",
  });
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
    } = req.query;

    // Pagination
    const skip = (page - 1) * limit;

    // Filters
    let trendingProducts, onSaleProducts, nearbyProducts;

    if (!category || category === "all") {
      trendingProducts = Product.find({ isTrending: true })
        .skip(skip)
        .limit(limit)
        .sort("-createdAt")
        .populate("categories");

      onSaleProducts = Product.find({ isOnSale: true })
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

        nearbyProducts = Product.find({
          user: { $in: nearbyShops.map((shop) => shop._id) },
        })
          .skip(skip)
          .limit(limit)
          .sort("-createdAt");
      } else {
        nearbyProducts = Product.find()
          .skip(skip)
          .limit(limit)
          .sort("-createdAt");
      }
    } else {
      switch (category) {
        case "trending":
          trendingProducts = Product.find({ isTrending: true })
            .skip(skip)
            .limit(limit)
            .sort("-createdAt")
            .populate("categories");
          break;
        case "featured":
          onSaleProducts = Product.find({ isOnSale: true })
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

            nearbyProducts = Product.find({
              user: { $in: nearbyShops.map((shop) => shop._id) },
            })
              .skip(skip)
              .limit(limit)
              .sort("-createdAt");
          } else {
            nearbyProducts = Product.find()
              .skip(skip)
              .limit(limit)
              .sort("-createdAt");
          }
          break;
      }
    }

    const [trending, onSale, nearby] = await Promise.all([
      trendingProducts,
      onSaleProducts,
      nearbyProducts,
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          trending: trending ? trending : [],
          onSale: onSale ? onSale : [],
          nearby: nearby ? nearby : [],
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
    const product = await Product.findById(productId).populate("user");
    res
      .status(200)
      .json(new ApiResponse(200, product, "product recived successfully"));
  } catch (error) {
    throw new ApiError(400, "something went wrong");
  }
});
