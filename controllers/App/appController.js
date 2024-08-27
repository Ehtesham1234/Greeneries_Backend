const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const Role = require("../../models/roles/roles.models");
const User = require("../../models/User.models");
const Product = require("../../models/Product.models");
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

//pagination dalna hai jisse limited product jaye ekbar mein sab bhejne se problem aa sakta hai.
exports.getProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id })
      .sort("-createdAt")
      .select(" user name price image  rating");

    res
      .status(200)
      .json(new ApiResponse(200, products, "verified successfully"));
  } catch (error) {
    throw new ApiError(400, "No prodcut found");
  }
});

exports.getProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    res
      .status(200)
      .json(new ApiResponse(200, product, "product recived successfully"));
  } catch (error) {
    throw new ApiError(400, "something went wrong");
  }
});

