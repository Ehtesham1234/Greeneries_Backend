const mongoose = require("mongoose");

const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const BuyerSchema = new Schema({
  user: { type: ObjectId, ref: "User", required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String },
  address: { type: String },
  countryId: { type: String },
  stateCode: { type: String },
  city: { type: String },
  zipCode: { type: String },
  phoneNumber: { type: String, trim: true, default: null },
});

module.exports = mongoose.model("Buyer", BuyerSchema);
