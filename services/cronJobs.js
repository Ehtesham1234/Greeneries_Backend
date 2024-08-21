const cron = require("node-cron");
const Product = require("../models/Product.models");

cron.schedule("0 0 * * *", async () => {
  const trendingThreshold = 50; // Define your criteria, e.g., 50 sales in a week

  const products = await Product.find({});

  products.forEach(async (product) => {
    if (product.salesCount >= trendingThreshold) {
      await Product.findByIdAndUpdate(product._id, { isTrending: true });
    } else {
      await Product.findByIdAndUpdate(product._id, { isTrending: false });
    }
  });
});
