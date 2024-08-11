const mongoose = require("mongoose");

const { Schema } = mongoose;

const RoleSchema = new Schema(
  {
    id: { type: Number },
    name: { type: String },
    capability: { type: String },
    isActive: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", RoleSchema);
