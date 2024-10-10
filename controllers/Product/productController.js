const Product = require("../../models/Product.models");
const PlantCategory = require("../../models/PlantCategory.models");
const PlantSubCategory = require("../../models/PlantSubCategories.models");
const Shop = require("../../models/Shop.models");
const { fileSizeFormatter } = require("../../utils/fileUploads");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const {
  uploadOnCloudinary,
  removeFromCloudinary,
} = require("../../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const XLSX = require("xlsx");

const generateSKU = (categoryCode, subcategoryCode, uniqueNumber) => {
  return `${categoryCode}-${subcategoryCode}-${uniqueNumber}`;
};

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
    shopId,
    productType,
  } = req.body;

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
    // res.status(400);
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
    // console.log("req.files", req.files);
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
        // res.status(500);
        throw new ApiError(500, "Image could not be uploaded");
      }
    }
  }

  // Retrieve category and subcategory codes
  const categoryCode =
    categoryDocs.length > 0
      ? categoryDocs[0].name.slice(0, 3).toUpperCase()
      : "UNKNOWN";
  const subcategoryCode =
    subCategoryDocs.length > 0
      ? subCategoryDocs[0].name.slice(0, 2).toUpperCase()
      : "GEN";

  // Generate unique number (for simplicity, using a UUID here, but should be sequential or meaningful in production)
  const uniqueNumber = Date.now(); // Example of a simple unique number

  // Generate SKU
  const sku = generateSKU(categoryCode, subcategoryCode, uniqueNumber);

  // Create Product
  const product = await Product.create({
    seller: shopId,
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
    productType,
  });

  res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

// Get all Products
exports.getProducts = asyncHandler(async (req, res, next) => {
  try {
    const { page = 1, limit = 10, location, distance = 5000 } = req.query;

    // Pagination
    const skip = (page - 1) * limit;

    // Filters
    const trendingProducts = Product.find({ isTrending: true })
      .skip(skip)
      .limit(limit)
      .sort("-createdAt");

    const onSaleProducts = Product.find({ isOnSale: true })
      .skip(skip)
      .limit(limit)
      .sort("-createdAt");

    const allProducts = Product.find()
      .skip(skip)
      .limit(limit)
      .sort("-createdAt");

    // Nearby filter
    let nearbyShops = [];
    if (location) {
      const [longitude, latitude] = location.split(",");
      nearbyShops = await Shop.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: parseFloat(distance), // Use distance from query or default
          },
        },
      }).select("_id");
    }

    const nearbyProducts = nearbyShops.length
      ? Product.find({ seller: { $in: nearbyShops.map((shop) => shop._id) } })
          .skip(skip)
          .limit(limit)
          .sort("-createdAt")
      : [];

    const [trending, onSale, nearby] = await Promise.all([
      trendingProducts,
      onSaleProducts,
      nearbyProducts,
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          trending: trending.length ? trending : [],
          onSale: onSale.length ? onSale : [],
          nearby: nearby.length ? nearby : [],
        },
        "Fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, "Failed to fetch products", [error.message]);
  }
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
    productType,
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
      productType,
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

async function processRowsProduct(fileRows, sellerId) {
  try {
    const products = [];

    for (let row of fileRows) {
      const {
        name,
        categories,
        subcategories,
        quantity,
        price,
        description,
        rating,
        imageUrl,
        availability,
        isFeatured,
        isTrending,
        isOnSale,
        salePrice,
        productType,
      } = row;

      // Validation
      if (
        !name ||
        !categories ||
        !quantity ||
        !price ||
        !description ||
        rating === undefined ||
        rating === null
      ) {
        throw new ApiError(400, "Please fill in all required fields");
      }
      // Convert Boolean strings to actual Boolean values
      const isFeaturedBool = isFeatured === "TRUE" || isFeatured === "true";
      const isTrendingBool = isTrending === "TRUE" || isTrending === "true";
      const isOnSaleBool = isOnSale === "TRUE" || isOnSale === "true";

      // Parse salePrice as a number, if provided
      const salePriceNum = salePrice ? parseFloat(salePrice) : null;
      if (isOnSaleBool && (salePriceNum === null || isNaN(salePriceNum))) {
        throw new ApiError(400, "Invalid sale price");
      }

      // Handle categories (comma-separated or single ID)
      const categoryIds = categories.split(",").map((id) => id.trim());
      const categoryDocs = await PlantCategory.find({
        _id: { $in: categoryIds },
      });

      // console.log("categoryDocs", categoryDocs);
      if (categoryDocs.length !== categoryIds.length) {
        throw new ApiError(400, "One or more categories not found");
      }

      // Handle subcategories (comma-separated or single ID)
      let subCategoryDocs = [];
      if (subcategories) {
        const subcategoryIds = subcategories.split(",").map((id) => id.trim());
        subCategoryDocs = await PlantSubCategory.find({
          _id: { $in: subcategoryIds },
        });

        if (subCategoryDocs.length !== subcategoryIds.length) {
          throw new ApiError(400, "One or more subcategories not found");
        }
      }
      // console.log("subCategoryDocs", subCategoryDocs);
      // Retrieve category and subcategory codes
      const categoryCode =
        categoryDocs.length > 0
          ? categoryDocs[0].name.slice(0, 3).toUpperCase()
          : "UNKNOWN";
      const subcategoryCode =
        subCategoryDocs.length > 0
          ? subCategoryDocs[0].name.slice(0, 2).toUpperCase()
          : "GEN";

      const uniqueNumber = Date.now();

      // Generate SKU
      const sku = generateSKU(categoryCode, subcategoryCode, uniqueNumber);

      // Prepare product data
      const productData = {
        seller: sellerId,
        name,
        sku,
        categories: categoryDocs.map((doc) => doc._id),
        subcategories: subCategoryDocs.map((doc) => doc._id),
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        description,
        rating: parseFloat(rating),
        image: imageUrl ? [{ filePath: imageUrl }] : [], // Add image URL handling
        availability,
        isFeatured: isFeaturedBool,
        isTrending: isTrendingBool,
        isOnSale: isOnSaleBool,
        salePrice: salePriceNum,
        productType,
      };

      // Check if product already exists (case-insensitive)
      const existingProduct = await Product.findOne({
        user: sellerId,
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });
      // console.log("existingProduct", existingProduct);

      if (existingProduct) {
        // Update existing product
        const updatedProduct = await Product.findByIdAndUpdate(
          existingProduct._id,
          productData,
          { new: true }
        );
        // console.log("updatedProduct", updatedProduct);
        products.push(updatedProduct);
      } else {
        // Create new product
        const product = new Product(productData);
        const savedProduct = await product.save();
        products.push(savedProduct);
      }
    }

    // console.log("products", products);
  } catch (error) {
    console.error("Error processing rows:", error);
    throw Error;
  }
}

// Add product with CSV
exports.addProductFromCsv = asyncHandler(async (req, res) => {
  const { sellerId } = req.query;
  const csvFileName = "PRODUCT";
  // console.log("sellerId 1", sellerId);

  if (!req.file) {
    throw new ApiError(400, "No file uploaded.");
  }

  if (!sellerId) {
    throw new ApiError(400, "Seller ID is required.");
  }

  let fileRows = [];
  // console.log("sellerId 2", sellerId);
  // Check if file is a CSV
  if (req.file.mimetype === "text/csv") {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        fileRows.push(data); // push each row
      })
      .on("end", async () => {
        fs.unlinkSync(req.file.path); // remove temp file
        // Process 'fileRows' and respond
        // console.log("sellerId 3", sellerId);
        switch (csvFileName) {
          case "PRODUCT":
            await processRowsProduct(fileRows, sellerId);
            break;
          default:
            throw new ApiError(400, "Invalid file name");
        }
        // console.log("sellerId 4", sellerId);
        res
          .status(200)
          .send(new ApiResponse(200, "File uploaded successfully."));
      });
  } else if (req.file.mimetype.includes("spreadsheetml")) {
    // Check if file is an Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheet_name_list = workbook.SheetNames;
    fileRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    fs.unlinkSync(req.file.path); // remove temp file
    await processRowsProduct(fileRows, sellerId);
    // console.log("fileRows", fileRows);
    res.status(200).send(new ApiResponse(200, "File uploaded successfully."));
  } else {
    throw new ApiError(404, "Only CSV and XLS files are acceptable");
  }
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
