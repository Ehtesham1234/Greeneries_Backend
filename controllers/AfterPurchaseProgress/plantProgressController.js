const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { ApiResponse } = require("../../utils/ApiResponse");
const plantService = require("../../services/plantService");
const Purchased = require("../../models/Purchased.models");
const Buyer = require("../../models/Buyer.models");
const Order = require("../../models/Order.models");

exports.getPurchasedProducts = asyncHandler(async (req, res) => {
  // console.log(req.user);
  const user = req.user;
  const buyers = await Buyer.find({ user: user._id });
  // console.log(buyers);
  if (!buyers) {
    throw new ApiError(404, "Buyers not found");
  }
  const orders = await Order.find({ userId: { $in: buyers } });
  // console.log(orders);
  const purchasedProducts = await Purchased.find({
    orderId: { $in: orders },
  })
    .populate({ path: "productId", select: "name price description image" })
    .select("productId quantity");
  // console.log(purchasedProducts);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        purchasedProducts,
        "Purchased products retrieved successfully"
      )
    );
});

exports.getInitialQuestions = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        plantService.INITIAL_ASSESSMENT_QUESTIONS,
        "Assessment questions retrieved"
      )
    );
});

exports.submitInitialAssessment = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const { purchaseId } = req.params;

  if (!answers || !Array.isArray(answers)) {
    throw new ApiError(400, "Invalid assessment answers");
  }

  const updatedPurchase = await plantService.handleInitialAssessment(
    purchaseId,
    answers
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPurchase.plantProgress,
        "Assessment completed successfully"
      )
    );
});

exports.getDailyTask = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const purchase = await Purchased.findById(purchaseId);

  if (!purchase) {
    throw new ApiError(404, "Plant purchase not found");
  }

  if (!purchase.plantProgress.assessmentComplete) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { needsAssessment: true },
          "Initial assessment required"
        )
      );
  }

  const task = await plantService.generateDailyTaskIfNone(
    purchase.plantProgress
  );

  if (!task) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Task already generated for today"));
  }

  // Save the task in care history
  const updatedPurchase = await Purchased.findByIdAndUpdate(
    purchaseId,
    {
      $push: {
        "plantProgress.careHistory": {
          task,
          growthStage: purchase.plantProgress.growthStage,
        },
      },
      $set: {
        "plantProgress.lastTaskCreated": new Date(),
      },
    },
    { new: true }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        task,
        careHistory: updatedPurchase.plantProgress.careHistory,
      },
      "Daily task generated"
    )
  );
});

exports.completeTask = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const { taskId } = req.body;

  const updatedPurchase = await plantService.completeTask(purchaseId, taskId);
  if (!updatedPurchase) {
    throw new ApiError(404, "Plant purchase or task not found");
  }

  // Check for growth milestones after task completion
  await plantService.checkGrowthMilestones(updatedPurchase);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPurchase.plantProgress,
        "Task completed and progress updated"
      )
    );
});

exports.reportIssue = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const { issue } = req.body;

  if (!issue || typeof issue !== "string") {
    throw new ApiError(400, "Invalid issue description");
  }

  const updatedPurchase = await plantService.reportIssue(purchaseId, issue);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        issues: updatedPurchase.plantProgress.issues,
        needsAttention: updatedPurchase.plantProgress.needsAttention,
      },
      "Issue reported and solution generated"
    )
  );
});

exports.updatePlantHeight = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const { height } = req.body;

  if (typeof height !== "number" || height <= 0) {
    throw new ApiError(400, "Invalid height measurement");
  }

  const updatedPurchase = await plantService.updatePlantHeight(
    purchaseId,
    height
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPurchase.plantProgress.heightProgress,
        "Height updated successfully"
      )
    );
});

exports.getPlantProgress = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const purchase = await Purchased.findById(purchaseId);

  if (!purchase) {
    throw new ApiError(404, "Plant purchase not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        ...purchase.plantProgress.toObject(),
        assessmentNeeded: !purchase.plantProgress.assessmentComplete,
      },
      "Plant progress fetched"
    )
  );
});
