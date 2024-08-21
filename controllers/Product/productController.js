const Product = require("../../models/Product.models");
const PlantCategory = require("../../models/PlantCategory.models");
const PlantSubCategory = require("../../models/PlantSubCategories.models");
const { fileSizeFormatter } = require("../../utils/fileUploads");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const { getPlantInfo } = require("../../utils/PlantsApiService");
const {
  uploadOnCloudinary,
  removeFromCloudinary,
} = require("../../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
// Create Product
exports.createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    categories,
    subcategories,
    quantity,
    price,
    description,
    // availability,
    rating,
    scientificName,
    careInstructions,
  } = req.body;

  try {
    // Validation
    if (
      !name ||
      !categories ||
      !quantity ||
      !price ||
      !description ||
      // !availability ||
      rating === undefined ||
      rating === null // Allow rating to be 0 or any number but not undefined
    ) {
      res.status(400);
      throw new ApiError(400, "Please fill in all required fields");
    }

    // Check if categories exist
    const categoryDocs = await PlantCategory.find({ _id: { $in: categories } });
    if (categoryDocs.length !== categories.length) {
      throw new ApiError(404, "One or more categories not found");
    }

    // Check if subcategories exist, if provided
    let subCategoryDocs = [];
    if (subcategories && subcategories.length > 0) {
      subCategoryDocs = await PlantSubCategory.find({
        _id: { $in: subcategories },
      });
      if (subCategoryDocs.length !== subcategories.length) {
        throw new ApiError(404, "One or more subcategories not found");
      }
    }

    // Handle Image upload
    let fileData = [];
    if (req.files) {
      for (const file of req.files) {
        try {
          const uploadedFile = await uploadOnCloudinary(file.path);
          if (!uploadedFile) {
            res.status(500);
            throw new ApiError(500, "Image could not be uploaded");
          }
          fileData.push({
            fileName: file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: file.mimetype,
            fileSize: fileSizeFormatter(file.size, 2),
          });
          // Remove the file from the local folder after uploading
          // if (fs.existsSync(file.path)) {
          //   fs.unlink(file.path, (err) => {
          //     if (err) {
          //       console.error("Error while deleting local image file:", err);
          //     }
          //   });
          // } else {
          //   console.warn("File not found, cannot delete:", file.path);
          // }
        } catch (error) {
          res.status(500);
          throw new ApiError(500, "Image could not be uploaded");
        }
      }
    }

    // Generate unique SKU
    const sku = uuidv4();

    // Create Product
    const product = await Product.create({
      user: req.user.id,
      name,
      sku,
      categories,
      subcategories,
      quantity,
      price,
      description,
      image: fileData, // Ensure image field matches the schema
      // availability,
      rating,
      scientificName,
      careInstructions,
    });

    res
      .status(201)
      .json(new ApiResponse(201, product, "Product created successfully"));
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

// Get all Products
exports.getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ user: req.user.id }).sort("-createdAt");
  res.status(200).json(products);
});

// Get single product
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  // if product doesnt exist
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  // Match product to its user
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }
  res.status(200).json(product);
});

// Delete Product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  // if product doesnt exist
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  // Match product to its user
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }
  await product.remove();
  res.status(200).json({ message: "Product deleted." });
});

// Update Product
exports.updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    categories,
    subcategories,
    quantity,
    price,
    description,
    availability,
    rating,
    reviews,
  } = req.body;
  const { id } = req.params;
  const product = await Product.findById(id);

  // if product doesn't exist
  if (!product) {
    res.status(404);
    throw new ApiError(404, "Product not found");
  }

  // Match product to its user
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new ApiError(401, "User not authorized");
  }

  // Check if categories and subcategories exist
  if (categories) {
    const categoryDocs = await PlantCategory.find({ _id: { $in: categories } });
    if (categoryDocs.length !== categories.length) {
      throw new ApiError(404, "One or more categories not found");
    }
  }
  if (subcategories) {
    const subCategoryDocs = await PlantSubCategory.find({
      _id: { $in: subcategories },
    });
    if (subCategoryDocs.length !== subcategories.length) {
      throw new ApiError(404, "One or more subcategories not found");
    }
  }

  // Handle Image upload
  let fileData = [];
  if (req.files) {
    // Remove old images
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await removeFromCloudinary(image.filePath); // Assuming you have a function to remove images from Cloudinary
      }
    }

    // Upload new images
    for (const file of req.files) {
      try {
        const uploadedFile = await uploadOnCloudinary(file.path);
        if (!uploadedFile) {
          res.status(500);
          throw new ApiError(500, "Image could not be uploaded");
        }
        fileData.push({
          fileName: file.originalname,
          filePath: uploadedFile.secure_url,
          fileType: file.mimetype,
          fileSize: fileSizeFormatter(file.size, 2),
        });
      } catch (error) {
        res.status(500);
        throw new ApiError(500, "Image could not be uploaded");
      }
    }
  }

  // Update Product
  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: id },
    {
      name,
      categories,
      subcategories,
      quantity,
      price,
      description,
      images: fileData.length > 0 ? fileData : product.images,
      reviews,
      availability,
      rating,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
});

exports.isFeaturedProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  await Product.findByIdAndUpdate(productId, { isFeatured: true });
  res.send({ success: true, message: "Product marked as featured." });
});

exports.onSalesProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { salePrice } = req.body;
  await Product.findByIdAndUpdate(productId, { isOnSale: true, salePrice });
  res.send({ success: true, message: "Product marked as on sale." });
});
exports.createCategory = asyncHandler(async (req, res) => {
  const category = await PlantCategory.create(req.body);
  res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await PlantCategory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await PlantCategory.findByIdAndDelete(req.params.id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

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

exports.createSubCategory = asyncHandler(async (req, res) => {
  const { subcategories, parentCategoryId } = req.body;

  // Check if parent category exists
  const parentCategory = await PlantCategory.findById(parentCategoryId);
  if (!parentCategory) {
    throw new ApiError(404, "Parent category not found");
  }

  // Create subcategories
  const createdSubCategories = await PlantSubCategory.insertMany(
    subcategories.map((subcategory) => ({
      ...subcategory,
      parentCategory: parentCategoryId,
    }))
  );

  // Add subcategories to parent category
  parentCategory.subcategories.push(
    ...createdSubCategories.map((sub) => sub._id)
  );
  await parentCategory.save();

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdSubCategories,
        "Subcategories created successfully"
      )
    );
});

exports.updateSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, parentCategoryId } = req.body;

  // Check if subcategory exists
  const subCategory = await PlantSubCategory.findById(id);
  if (!subCategory) {
    throw new ApiError(404, "Subcategory not found");
  }

  // Update subcategory details
  subCategory.name = name || subCategory.name;
  subCategory.description = description || subCategory.description;
  subCategory.parentCategory = parentCategoryId || subCategory.parentCategory;

  await subCategory.save();

  res
    .status(200)
    .json(
      new ApiResponse(200, subCategory, "Subcategory updated successfully")
    );
});

exports.deleteSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if subcategory exists
  const subCategory = await PlantSubCategory.findById(id);
  if (!subCategory) {
    throw new ApiError(404, "Subcategory not found");
  }

  // Remove subcategory from parent category
  await PlantCategory.findByIdAndUpdate(subCategory.parentCategory, {
    $pull: { subcategories: subCategory._id },
  });

  // Delete subcategory
  await subCategory.remove();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Subcategory deleted successfully"));
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
