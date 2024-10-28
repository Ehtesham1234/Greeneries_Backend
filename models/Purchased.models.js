const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const plantAssessmentSchema = new Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  assessmentDate: { type: Date, default: Date.now },
});

const taskSchema = new Schema({
  taskDescription: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const plantIssueSchema = new Schema({
  issue: { type: String, required: true },
  reportDate: { type: Date, default: Date.now },
  solution: [{ type: String }],
  resolved: { type: Boolean, default: false },
  growthStageWhenReported: { type: Number },
});

const plantProgressSchema = new Schema({
  isPlant: { type: Boolean, default: false },
  plantName: { type: String },
  growthStage: { type: Number, default: 0 },
  day: { type: Number, default: 0 },
  environment: { type: String },
  assessmentComplete: { type: Boolean, default: false },
  lastAssessment: { type: Date },
  lastTaskCompleted: { type: Date },
  tasksCompleted: { type: Number, default: 0 },
  lastTaskCreated: { type: Date },
  currentTasks: [taskSchema], // Replace careHistory with currentTasks
  issues: [plantIssueSchema],
  initialAssessment: [plantAssessmentSchema],
  heightProgress: [
    {
      height: Number,
      recordedAt: { type: Date, default: Date.now },
    },
  ],
  needsAttention: { type: Boolean, default: false },
  notes: { type: String },
});

const purchasedSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  productId: [{ type: Schema.Types.ObjectId, ref: "Product", required: true }],
  sellerIds: [{ type: Schema.Types.ObjectId, ref: "Shop", required: true }],
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  plantProgress: plantProgressSchema,
});

module.exports = mongoose.model("Purchased", purchasedSchema);
