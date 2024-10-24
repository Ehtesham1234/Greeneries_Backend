const Purchased = require("../models/Purchased.models");
const Order = require("../models/Order.models");
const User = require("../models/User.models");
const { sendPushNotification } = require("../utils/socket/sendNotification");

const GROWTH_STAGES = {
  SEEDLING: 0,
  VEGETATIVE: 1,
  MATURE: 2,
  FLOWERING: 3,
  FRUITING: 4,
};

const STAGE_CHARACTERISTICS = {
  [GROWTH_STAGES.SEEDLING]: {
    name: "Seedling",
    characteristics: [
      "Delicate stems and leaves",
      "First true leaves developing",
      "Height under 6 inches",
      "Requires high humidity",
    ],
    careNeeds: [
      "Gentle watering",
      "High humidity",
      "Moderate light",
      "No fertilizer yet",
    ],
  },
  [GROWTH_STAGES.VEGETATIVE]: {
    name: "Vegetative",
    characteristics: [
      "Rapid leaf growth",
      "Strengthening stem",
      "Developing root system",
      "Height 6-12 inches",
    ],
    careNeeds: [
      "Regular watering",
      "Full light exposure",
      "Start fertilizing",
      "Consider support structures",
    ],
  },
  // Add characteristics for other stages...
};

const INITIAL_ASSESSMENT_QUESTIONS = [
  {
    id: "current_size",
    question: "What's the current size of your plant?",
    options: [
      "Seed/Sprout",
      "Small plant with few leaves",
      "Medium-sized plant",
      "Large plant",
      "Flowering/Fruiting",
    ],
    stageMapping: {
      "Seed/Sprout": GROWTH_STAGES.SEEDLING,
      "Small plant with few leaves": GROWTH_STAGES.VEGETATIVE,
      "Medium-sized plant": GROWTH_STAGES.MATURE,
      "Large plant": GROWTH_STAGES.FLOWERING,
      "Flowering/Fruiting": GROWTH_STAGES.FRUITING,
    },
  },
  {
    id: "leaf_count",
    question: "How many true leaves does your plant have?",
    options: [
      "None/Cotyledons only",
      "2-4 leaves",
      "5-8 leaves",
      "More than 8 leaves",
    ],
    contributesToStage: true,
  },
  {
    id: "environment",
    question: "Where are you growing your plant?",
    options: [
      "Indoor with artificial light",
      "Indoor near window",
      "Outdoor shade",
      "Outdoor full sun",
    ],
    metadata: true,
  },
  {
    id: "watering_schedule",
    question: "How often are you currently watering?",
    options: ["Daily", "Every 2-3 days", "Weekly", "As needed"],
    metadata: true,
  },
];

const generateAIPrompt = (
  plantName,
  growthStage,
  environment,
  context = {}
) => {
  const stageInfo = STAGE_CHARACTERISTICS[growthStage];
  const basePrompt = `
Generate a detailed care instruction for a ${plantName} in the ${
    stageInfo.name
  } stage.
Environment: ${environment}

Current Stage Characteristics:
${stageInfo.characteristics.map((c) => `- ${c}`).join("\n")}

Stage-Specific Care Needs:
${stageInfo.careNeeds.map((c) => `- ${c}`).join("\n")}

Additional Context:
${context.recentIssues ? `- Recent Issues: ${context.recentIssues}` : ""}
${context.lastTask ? `- Last Task Completed: ${context.lastTask}` : ""}
${
  context.weatherCondition
    ? `- Weather Condition: ${context.weatherCondition}`
    : ""
}

Please provide specific, actionable instructions that:
1. Address the current growth stage needs
2. Consider the growing environment
3. Include any preventive measures
4. Specify quantities and timing for care tasks
`;

  return basePrompt;
};

const generateDailyTask = async (plantProgress, context = {}) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = generateAIPrompt(
    plantProgress.plantName,
    plantProgress.growthStage,
    plantProgress.environment,
    context
  );

  const result = await model.generateContent(prompt);
  return result.response.text();
};

const determineInitialGrowthStage = (assessmentAnswers) => {
  let stageScore = 0;

  const sizeAnswer = assessmentAnswers.find(
    (a) => a.questionId === "current_size"
  );
  if (sizeAnswer) {
    stageScore =
      INITIAL_ASSESSMENT_QUESTIONS[0].stageMapping[sizeAnswer.answer];
  }

  const leafAnswer = assessmentAnswers.find(
    (a) => a.questionId === "leaf_count"
  );
  if (leafAnswer) {
    const leafIndex = INITIAL_ASSESSMENT_QUESTIONS[1].options.indexOf(
      leafAnswer.answer
    );
    stageScore = Math.max(stageScore, leafIndex);
  }

  return stageScore;
};

const handleInitialAssessment = async (purchaseId, assessmentAnswers) => {
  const purchase = await Purchased.findOne({ _id: purchaseId });
  if (!purchase) throw new Error("Purchase not found");

  const initialStage = determineInitialGrowthStage(assessmentAnswers);
  const environment = assessmentAnswers.find(
    (a) => a.questionId === "environment"
  )?.answer;

  // Save full assessment responses
  const formattedAssessment = assessmentAnswers.map((answer) => ({
    questionId: answer.questionId,
    question: INITIAL_ASSESSMENT_QUESTIONS.find(
      (q) => q.id === answer.questionId
    ).question,
    answer: answer.answer,
  }));

  return await Purchased.findOneAndUpdate(
    { _id: purchaseId },
    {
      $set: {
        "plantProgress.growthStage": initialStage,
        "plantProgress.environment": environment,
        "plantProgress.assessmentComplete": true,
        "plantProgress.lastAssessment": new Date(),
        "plantProgress.initialAssessment": formattedAssessment,
      },
    },
    { new: true }
  );
};

const generateDailyTaskIfNone = async (plantProgress) => {
  if (isTaskAlreadyGenerated(plantProgress)) {
    return null;
  }

  // Get recent issues and last task for context
  const recentIssues = plantProgress.issues
    .filter((i) => !i.resolved)
    .map((i) => i.issue)
    .join(", ");

  const lastTask =
    plantProgress.careHistory.length > 0
      ? plantProgress.careHistory[plantProgress.careHistory.length - 1].task
      : null;

  const task = await generateDailyTask(plantProgress, {
    recentIssues,
    lastTask,
  });

  return task;
};

const completeTask = async (purchaseId, taskId) => {
  return await Purchased.findOneAndUpdate(
    {
      _id: purchaseId,
      "plantProgress.careHistory._id": taskId,
    },
    {
      $set: {
        "plantProgress.careHistory.$.completed": true,
        "plantProgress.careHistory.$.completedAt": new Date(),
        "plantProgress.lastTaskCompleted": new Date(),
      },
      $inc: {
        "plantProgress.tasksCompleted": 1,
        "plantProgress.growthStage": 0.2, // Incremental growth
      },
    },
    { new: true }
  );
};

const reportIssue = async (purchaseId, issueDescription) => {
  const purchase = await Purchased.findById(purchaseId);
  if (!purchase) throw new Error("Purchase not found");

  const solution = await generateAISolutionForIssue(
    purchase.plantProgress.plantName,
    purchase.plantProgress.growthStage,
    issueDescription
  );

  return await Purchased.findOneAndUpdate(
    { _id: purchaseId },
    {
      $push: {
        "plantProgress.issues": {
          issue: issueDescription,
          solution,
          growthStageWhenReported: purchase.plantProgress.growthStage,
        },
      },
      $set: { "plantProgress.needsAttention": true },
    },
    { new: true }
  );
};

const generateAISolutionForIssue = async (plantName, growthStage, issue) => {
  const stageInfo = STAGE_CHARACTERISTICS[growthStage];
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
Provide a detailed solution for the following plant issue:
Plant: ${plantName}
Growth Stage: ${stageInfo.name}
Current Stage Characteristics: ${stageInfo.characteristics.join(", ")}
Reported Issue: ${issue}

Please provide:
1. Diagnosis of the potential causes
2. Step-by-step solution
3. Preventive measures for the future
4. Warning signs to watch for
5. When to seek professional help if needed
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

const updatePlantHeight = async (purchaseId, height) => {
  return await Purchased.findOneAndUpdate(
    { _id: purchaseId },
    {
      $push: {
        "plantProgress.heightProgress": { height },
      },
    },
    { new: true }
  );
};

const checkGrowthMilestones = async (purchase) => {
  const { growthStage, heightProgress } = purchase.plantProgress;

  // Check if height indicates need for stage progression
  if (heightProgress && heightProgress.length >= 2) {
    const recentHeight = heightProgress[heightProgress.length - 1].height;
    const previousHeight = heightProgress[heightProgress.length - 2].height;
    const growthRate = (recentHeight - previousHeight) / previousHeight;

    if (growthRate > 0.2) {
      // 20% growth
      await Purchased.findByIdAndUpdate(purchase._id, {
        $inc: { "plantProgress.growthStage": 1 },
      });

      // Notify user of stage progression
      const order = await Order.findById(purchase.orderId);
      if (order) {
        const user = await User.findById(order.userId);
        if (user?.fcmToken) {
          await sendPushNotification(
            user.fcmToken,
            "Plant Growth Milestone!",
            `Your ${purchase.plantProgress.plantName} has progressed to a new growth stage!`
          );
        }
      }
    }
  }
};

module.exports = {
  GROWTH_STAGES,
  INITIAL_ASSESSMENT_QUESTIONS,
  handleInitialAssessment,
  generateDailyTaskIfNone,
  completeTask,
  reportIssue,
  updatePlantHeight,
  checkGrowthMilestones,
};
