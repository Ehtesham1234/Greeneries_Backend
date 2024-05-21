const statusCode = require("../../utils/http-status-code");
const errorMessage = require("../../languages/message");

const { State } = require("../../models/State.model");
const { City } = require("../../models/City.model");

// get states
exports.getState = async (req, res) => {
  try {
    const states = await State.find({});
    if (states) {
      return res.status(statusCode.OK).send({
        message: "States found successfully...",
        data: states,
      });
    } else {
      return res.status(statusCode.NotFound).send({
        message: "States data not found...",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.status(statusCode.InternalServerError).send({
      message: errorMessage.lblInternalServerError,
    });
  }
};

// get cities
exports.getCity = async (req, res) => {
  try {
    const stateCode = req.params?.stateCode;
    const cities = await City.find({ state_code: stateCode });
    if (cities) {
      return res.status(statusCode.OK).send({
        message: "Cities found successfully...",
        data: cities,
      });
    } else {
      return res.status(statusCode.NotFound).send({
        message: "Cities data not found...",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.status(statusCode.InternalServerError).send({
      message: errorMessage.lblInternalServerError,
    });
  }
};
