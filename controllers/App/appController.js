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
