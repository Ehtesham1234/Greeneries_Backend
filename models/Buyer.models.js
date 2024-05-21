const mongoose = require("mongoose");

const { Schema } = mongoose;
const ObjectId = mongoose.Schema.ObjectId;

const BuyerSchema = new Schema({
  firstName: { type: String, trim: true },
  lastName: { type: String },
  address: { type: String },
  countryId: { type: Number },
  stateCode: { type: String },
  city: { type: String },
  zipCode: { type: String },
  profileImage: {
    type: Object,
    default: {},
  },
});

exports.Buyer = mongoose.model("Buyer", BuyerSchema);
