const Product = require("../../models/Product.models");
const { fileSizeFormatter } = require("../../utils/fileUploads");

// Create Prouct
exports.createProduct = async (req, res) => {
  const { name, sku, category, quantity, price, description, image } = req.body;

  //   Validation
  if (!name || !category || !quantity || !price || !description) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  // Handle Image upload
  let fileData = {};
  if (req.files[0]) {
    // Add debug logging
    console.log("Saved image to", req.files[0].path);
    fileData = {
      fileName: req.files[0].originalname,
      filePath: req.files[0].path,
      fileType: req.files[0].mimetype,
      fileSize: fileSizeFormatter(req.files[0].size, 2),
    };
  }

  // Create Product
  const product = await Product.create({
    user: req.user.id,
    name,
    sku,
    category,
    quantity,
    price,
    description,
    image: Object.keys(fileData).length === 0 ? image : fileData,
  });

  res.status(201).json(product);
};

// Get all Products
exports.getProducts = async (req, res) => {
  const products = await Product.find({ user: req.user.id }).sort("-createdAt");
  res.status(200).json(products);
};

// Get single product
exports.getProduct = async (req, res) => {
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
};

// Delete Product
exports.deleteProduct = async (req, res) => {
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
};

// Update Product
exports.updateProduct = async (req, res) => {
  const { name, category, quantity, price, description } = req.body;
  const { id } = req.params;

  const product = await Product.findById(id);

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

  // Handle Image upload
  let fileData = {};
  if (req.file) {
    fileData = {
      fileName: req.files[0].originalname,
      filePath: req.files[0].path,
      fileType: req.files[0].mimetype,
      fileSize: fileSizeFormatter(req.files[0].size, 2),
    };
  }

  // Update Product
  exports.updatedProduct = await Product.findByIdAndUpdate(
    { _id: id },
    {
      name,
      category,
      quantity,
      price,
      description,
      image: Object.keys(fileData).length === 0 ? product?.image : fileData,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json(updatedProduct);
};

// Create Product
exports.createProduct = async (req, res) => {
  const {
    name,
    sku,
    category,
    quantity,
    price,
    description,
    image,
    availability,
    rating,
    reviews,
  } = req.body;

  // Validation
  if (
    !name ||
    !category ||
    !quantity ||
    !price ||
    !description ||
    !availability ||
    !rating
  ) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  // Handle Image upload
  let fileData = {};
  if (req.files[0]) {
    console.log("Saved image to", req.files[0].path);
    fileData = {
      fileName: req.files[0].originalname,
      filePath: req.files[0].path,
      fileType: req.files[0].mimetype,
      fileSize: fileSizeFormatter(req.files[0].size, 2),
    };
  }

  // Create Product
  const product = await Product.create({
    user: req.user.id,
    name,
    sku,
    category,
    quantity,
    price,
    description,
    image: Object.keys(fileData).length === 0 ? image : fileData,
    reviews,
    availability,
    rating,
  });

  res.status(201).json(product);
};

// Update Product
exports.updateProduct = async (req, res) => {
  const {
    name,
    category,
    quantity,
    price,
    description,
    availability,
    rating,
    reviews,
  } = req.body;
  const { id } = req.params;
  const product = await Product.findById(id);

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

  // Handle Image upload
  let fileData = {};
  if (req.file) {
    fileData = {
      fileName: req.files[0].originalname,
      filePath: req.files[0].path,
      fileType: req.files[0].mimetype,
      fileSize: fileSizeFormatter(req.files[0].size, 2),
    };
  }

  // Update Product
  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: id },
    {
      name,
      category,
      quantity,
      price,
      description,
      image: Object.keys(fileData).length === 0 ? product?.image : fileData,
      reviews,
      availability,
      rating,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json(updatedProduct);
};
