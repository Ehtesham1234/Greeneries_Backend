const Purchased = require("../../models/Purchased.models");
const User = require("../../models/User.models");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendPushNotification } = require("../../utils/socket/sendNotification");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getPlantProgress = async (req, res) => {
  try {
    const purchase = await Purchased.findOne({
      _id: req.params.purchaseId,
      "plantProgress.isPlant": true,
    });
    if (!purchase) {
      return res.status(404).json({ error: "Plant purchase not found" });
    }
    res.json(purchase.plantProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch plant progress" });
  }
};

exports.getDailyTask = async (req, res) => {
  try {
    const purchase = await Purchased.findOne({
      _id: req.params.purchaseId,
      "plantProgress.isPlant": true,
    });
    if (!purchase) {
      return res.status(404).json({ error: "Plant purchase not found" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Generate a daily care instruction for a ${purchase.plantProgress.plantName} at growth stage ${purchase.plantProgress.growthStage}. Include information about watering, sunlight, and any special care needed. Keep the instruction concise and easy to follow.`;

    const result = await model.generateContent(prompt);
    const task = result.response.text();

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate daily task" });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const purchase = await Purchased.findOneAndUpdate(
      { _id: req.params.purchaseId, "plantProgress.isPlant": true },
      {
        $inc: {
          "plantProgress.tasksCompleted": 1,
          "plantProgress.growthStage": 1,
        },
        "plantProgress.lastTaskCompleted": new Date(),
      },
      { new: true }
    );
    if (!purchase) {
      return res.status(404).json({ error: "Plant purchase not found" });
    }
    res.json(purchase.plantProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to update plant progress" });
  }
};

// // Cron job for daily notifications
// const cron = require("node-cron");

// cron.schedule("0 9 * * *", async () => {
//   try {
//     const activePlantPurchases = await Purchased.find({
//       "plantProgress.isPlant": true,
//       "plantProgress.growthStage": { $lt: 10 }, // Assuming 10 is the maximum growth stage
//     }).populate("orderId", "userId");

//     for (const purchase of activePlantPurchases) {
//       const user = await User.findById(purchase.orderId.userId).select(
//         "fcmToken"
//       );
//       if (user && user.fcmToken) {
//         const task = await generateDailyTask(purchase.plantProgress);
//         await sendPushNotification(
//           user.fcmToken,
//           "Daily Plant Care Task",
//           task,
//           { purchaseId: purchase._id.toString() }
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error in daily notification cron job:", error);
//   }
// });

// async function generateDailyTask(plantProgress) {
//   const model = genAI.getGenerativeModel({ model: "gemini-pro" });
//   const prompt = `Generate a daily care instruction for a ${plantProgress.plantName} at growth stage ${plantProgress.growthStage}. Include information about watering, sunlight, and any special care needed. Keep the instruction concise and easy to follow.`;

//   const result = await model.generateContent(prompt);
//   return result.response.text();
// }
