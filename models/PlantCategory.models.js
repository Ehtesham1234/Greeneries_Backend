// models/PlantCategory.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlantCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    subcategories: [{ type: Schema.Types.ObjectId, ref: "PlantSubCategory" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlantCategory", PlantCategorySchema);
