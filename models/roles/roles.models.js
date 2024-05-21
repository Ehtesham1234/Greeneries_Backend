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

exports.Role = mongoose.model("Role", RoleSchema);
