const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: "PlantCategory" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlantSubCategory", SubCategorySchema);
