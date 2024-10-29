// controllers/shareController.js

const Product = require("../../models/Product.models");
const Blog = require("../../models/Blog.models");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiResponse } = require("../../utils/ApiResponse");

// Allowed types for sharing
const ALLOWED_TYPES = ["product", "blog"];

exports.share = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  // Validate type and id
  if (!ALLOWED_TYPES.includes(type) || !id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid type or missing ID"));
  }

  let title, description, imageUrl, url, ogType, additionalInfo;

  try {
    if (type === "product") {
      // Fetch product details from the database
      const product = await Product.findById(id);
      if (!product) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Product not found"));
      }

      title = `Check out ${product.name} on YourAppName`;
      description = product.description
        ? product.description
        : `${product.name} is available on YourAppName.`;
      imageUrl =
        product.image && product.image.length > 0
          ? product.image[0].filePath
          : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
      url = `https://greeneries-backend.onrender.com/share/product/${product._id}`;
      ogType = "product";
      additionalInfo = `Price: $${product.price}`;
    } else if (type === "blog") {
      // Fetch blog details from the database
      const blog = await Blog.findById(id).populate("author");
      if (!blog) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Blog not found"));
      }

      title = `${blog.title} - YourAppName Blog`;
      description = blog.content
        ? blog.content.substring(0, 160) // Limit description length
        : `Read the latest blog on YourAppName.`;
      imageUrl =
        blog.image && blog.image.filePath
          ? blog.image.filePath
          : "https://via.placeholder.com/600x400.png?text=No+Image";
      url = `https://greeneries-backend.onrender.com/share/blog/${blog._id}`;
      ogType = "article";
      additionalInfo = `By ${blog.author.username}`;
    }

    // Construct the shareable HTML with Open Graph meta tags
    const metadata = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:url" content="${url}" />
          <meta property="og:type" content="${ogType}" />
          <!-- Optional: Add Twitter Card tags -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${imageUrl}" />
          <style>
              body {
                  background-color: #121212;
                  color: #ffffff;
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
              }
              .container {
                  text-align: center;
                  padding: 20px;
                  border: 1px solid #333;
                  border-radius: 8px;
                  background-color: #1e1e1e;
              }
              .icon {
                  width: 100px;
                  height: 100px;
                  margin-bottom: 20px;
              }
              .title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
              }
              .description {
                  font-size: 18px;
                  margin-bottom: 20px;
              }
              .image {
                  width: 100%;
                  max-width: 300px;
                  height: auto;
                  border-radius: 8px;
              }
              .additional-info {
                  margin-top: 10px;
                  font-size: 16px;
              }
              .cta-button {
                  display: inline-block;
                  margin-top: 20px;
                  padding: 10px 20px;
                  background-color: #1e90ff;
                  color: #fff;
                  text-decoration: none;
                  border-radius: 5px;
              }
              .cta-link {
                  color: #1e90ff;
                  text-decoration: none;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <img class="icon" src="https://yourdomain.com/path-to-your-app-icon.png" alt="App Icon">
              <div class="title">${title}</div>
              <div class="description">${description}</div>
              <img class="image" src="${imageUrl}" alt="Preview Image">
              ${
                additionalInfo
                  ? `<div class="additional-info">${additionalInfo}</div>`
                  : ""
              }
              <p>Download our app <a href="${url}" class="cta-link">here</a>.</p>
          </div>
      </body>
      </html>
    `;

    // Set Content-Type to text/html and send the metadata
    res.set("Content-Type", "text/html");
    res.send(metadata);
  } catch (error) {
    console.error(`Error sharing ${type}:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal Server Error"));
  }
});
