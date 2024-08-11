const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.ObjectId;

const cityhScrema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    state_id: Number,
    state_code: String,
    state_name: String,
    country_id: Number,
    country_code: String,
    country_name: String,
    latitude: Number,
    longitude: Number,
    location: String,
    wikidataid: Number,

    createdAt: {
      type: Date,
      default: new Date(),
    },
  },

  { timeStamps: true }
);

module.exports = mongoose.model("City", cityhScrema);
