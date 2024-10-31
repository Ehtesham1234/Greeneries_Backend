const Purchased = require("../models/Purchased.models");
const Order = require("../models/Order.models");
const User = require("../models/User.models");
const { sendPushNotification } = require("../utils/socket/sendNotification");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
  [GROWTH_STAGES.MATURE]: {
    name: "Mature",
    characteristics: [
      "Larger and more developed leaves",
      "Strong, sturdy stem",
      "Root system fully developed",
      "Height 12-24 inches",
    ],
    careNeeds: [
      "Deep watering as needed",
      "Full light or filtered sunlight",
      "Regular fertilizing",
      "Pruning may be required",
    ],
  },
  [GROWTH_STAGES.FLOWERING]: {
    name: "Flowering",
    characteristics: [
      "Development of buds and flowers",
      "Height may exceed 24 inches",
      "Leaves may begin to reduce growth",
      "Potential scent release",
    ],
    careNeeds: [
      "Consistent watering",
      "Full or partial light depending on species",
      "Increase phosphorus in fertilizer",
      "Support branches as needed",
    ],
  },
  [GROWTH_STAGES.FRUITING]: {
    name: "Fruiting",
    characteristics: [
      "Flowers transition into fruits",
      "Height and size remain stable",
      "Fruit ripening visible",
      "Plant energy focused on fruit development",
    ],
    careNeeds: [
      "Steady watering, especially during fruit formation",
      "Continue light exposure",
      "Fertilizer with potassium",
      "Harvest fruits when ripe",
    ],
  },
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
function getGrowthStage(growthStage) {
  // Taking the floor value of the growth stage
  return Math.floor(growthStage);
}
const generateAIPrompt = (
  plantName,
  growthStage,
  environment,
  context = {}
) => {
  const growthStageFloor = getGrowthStage(growthStage);
  const stageInfo = STAGE_CHARACTERISTICS[growthStageFloor];

  const basePrompt = `
Please provide the response in English.

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

Please provide exactly 5 specific, actionable tasks in English in the following format:
1. [task description]
2. [task description]
3. [task description]
4. [task description]
5. [task description]

Each task should be clear, concise, and independently completable.
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
const isTaskAlreadyGenerated = (plantProgress) => {
  const lastTaskDate = plantProgress.lastTaskCreated;
  if (!lastTaskDate) return false;

  const today = new Date();
  return (
    lastTaskDate.getDate() === today.getDate() &&
    lastTaskDate.getMonth() === today.getMonth() &&
    lastTaskDate.getFullYear() === today.getFullYear()
  );
};
const generateDailyTaskIfNone = async (plantProgress) => {
  // Check for existing tasks today
  if (isTaskAlreadyGenerated(plantProgress)) {
    return {
      existingTasks: true,
      tasks: plantProgress.currentTasks,
    };
  }

  // Get context for new tasks
  const context = {
    recentIssues:
      plantProgress.issues?.length > 0 ? plantProgress.issues[0].issue : null,
    lastTask:
      plantProgress.currentTasks?.length > 0
        ? plantProgress.currentTasks[0].taskDescription
        : null,
  };

  // Generate and parse new tasks
  const aiResponse = await generateDailyTask(plantProgress, context);
  const parsedTasks = parseDailyTasks(aiResponse);

  return {
    existingTasks: false,
    tasks: parsedTasks,
  };
};

const completeTask = async (purchaseId, taskId) => {
  // Find the purchase and update the specific task
  const purchase = await Purchased.findOneAndUpdate(
    {
      _id: purchaseId,
      "plantProgress.currentTasks._id": taskId,
    },
    {
      $set: {
        "plantProgress.currentTasks.$.completed": true,
        "plantProgress.currentTasks.$.completedAt": new Date(),
      },
    },
    { new: true }
  );

  if (!purchase) {
    throw new Error("Purchase or task not found");
  }

  // Check if all current tasks are completed
  const allTasksCompleted = purchase.plantProgress.currentTasks.every(
    (task) => task.completed
  );

  if (allTasksCompleted) {
    await Purchased.findOneAndUpdate(
      { _id: purchaseId },
      {
        $inc: {
          "plantProgress.tasksCompleted": 1,
          "plantProgress.day": 1,
        },
        $set: {
          "plantProgress.lastTaskCompleted": new Date(),
        },
      }
    );
  }

  return purchase;
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
      $set: {
        "plantProgress.issues": [
          {
            issue: issueDescription,
            solution,
            growthStageWhenReported: purchase.plantProgress.growthStage,
            reportDate: new Date(),
            resolved: false,
          },
        ],
        "plantProgress.needsAttention": true,
      },
    },
    { new: true }
  );
};

const generateAISolutionForIssue = async (plantName, growthStage, issue) => {
  const adjustedGrowthStage = getGrowthStage(growthStage);
  const stageInfo = STAGE_CHARACTERISTICS[adjustedGrowthStage];
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
Provide a solution for the following plant issue:
Plant: ${plantName}
Growth Stage: ${stageInfo.name}
Current Stage Characteristics: ${stageInfo.characteristics.join(", ")}
Reported Issue: ${issue}

Please provide the solution in exactly 5 points:
1. [Immediate action needed]
2. [Root cause analysis]
3. [Prevention steps]
4. [Warning signs to watch]
5. [Follow-up care]

Make each point clear and actionable.
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse the response into points
  const points = response
    .split("\n")
    .filter((line) => line.trim().match(/^\d\./))
    .map((line) => line.replace(/^\d\.\s*/, "").trim());

  return points;
};

const parseDailyTasks = (aiResponse) => {
  const tasks = aiResponse
    .split("\n")
    .filter((line) => /^\d\./.test(line.trim()))
    .map((line) => ({
      taskDescription: line.replace(/^\d\.\s*/, "").trim(),
      completed: false,
      completedAt: null,
    }));

  // Ensure we have exactly 5 tasks
  if (tasks.length !== 5) {
    // Create generic tasks if AI didn't provide exactly 5
    return Array(5)
      .fill(null)
      .map((_, i) => ({
        taskDescription: tasks[i]?.taskDescription || `Task ${i + 1}`,
        completed: false,
        completedAt: null,
      }));
  }

  return tasks;
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
      // 20% growth threshold
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
