const cron = require("node-cron");
const Product = require("../models/Product.models");
const Purchased = require("../models/Purchased.models");
const User = require("../models/User.models");
const Order = require("../models/Order.models");
const { sendPushNotification } = require("../utils/socket/sendNotification");
const plantService = require("../services/plantService");
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

// Schedule daily task generation
cron.schedule("0 8 * * *", async () => {
  try {
    const purchases = await Purchased.find({
      "plantProgress.isPlant": true,
      "plantProgress.assessmentComplete": true,
    });

    for (const purchase of purchases) {
      const task = await plantService.generateDailyTaskIfNone(
        purchase.plantProgress
      );

      if (task) {
        // Save the new task
        await Purchased.findByIdAndUpdate(purchase._id, {
          $push: {
            "plantProgress.careHistory": {
              task,
              growthStage: purchase.plantProgress.growthStage,
            },
          },
          $set: {
            "plantProgress.lastTaskCreated": new Date(),
          },
        });

        // Send notification to user
        const order = await Order.findById(purchase.orderId);
        if (order) {
          const user = await User.findById(order.userId);
          if (user?.fcmToken) {
            await sendPushNotification(
              user.fcmToken,
              "New Plant Care Task!",
              `Time to care for your ${purchase.plantProgress.plantName}!`,
              {
                type: "PLANT_TASK",
                purchaseId: purchase._id.toString(),
                plantName: purchase.plantProgress.plantName,
              }
            );
          }
        }
      }
    }
    console.log("Daily tasks generated successfully");
  } catch (error) {
    console.error("Error generating daily tasks:", error);
  }
});

// Check for overdue tasks every evening
cron.schedule("0 20 * * *", async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const purchases = await Purchased.find({
      "plantProgress.isPlant": true,
      "plantProgress.lastTaskCompleted": { $lt: yesterday },
    });

    for (const purchase of purchases) {
      const order = await Order.findById(purchase.orderId);
      if (order) {
        const user = await User.findById(order.userId);
        if (user?.fcmToken) {
          await sendPushNotification(
            user.fcmToken,
            "Plant Needs Attention!",
            `Don't forget to complete today's care task for your ${purchase.plantProgress.plantName}!`,
            {
              type: "TASK_REMINDER",
              purchaseId: purchase._id.toString(),
              plantName: purchase.plantProgress.plantName,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending task reminders:", error);
  }
});
