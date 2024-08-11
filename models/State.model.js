const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.ObjectId;

const statehScrema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    country_id: Number,
    country_code: String,
    country_name: String,
    state_code: String,
    type: String,
    latitude: Number,
    longitude: Number,
    location: String,

    createdAt: {
      type: Date,
      default: new Date(),
    },
  },

  { timeStamps: true }
);

module.exports = mongoose.model("State", statehScrema);
