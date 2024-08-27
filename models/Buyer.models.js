const mongoose = require("mongoose");

const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const BuyerSchema = new Schema({
  user: { type: ObjectId, ref: "User", required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String },
  address: { type: String },
  countryId: { type: Number },
  stateCode: { type: String },
  city: { type: String },
  zipCode: { type: String },
  phoneNumber: { type: String, trim: true, default: null },
  profileImage: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model("Buyer", BuyerSchema);
