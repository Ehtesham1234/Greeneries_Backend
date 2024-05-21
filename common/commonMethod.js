const axios = require("axios");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const secretOrKey = process.env.JWT_SECRET_KEY;
// const User = require("../Models/User");
const UserType = require("../Models/UserTypeMaster");
const _ = require("lodash");
require("dotenv").config();
const json2csv = require("json2csv");
const fs = require("fs");
const { Parser } = require("json2csv");
/*random otp genrate*/
exports.genOTP = () => {
  var digits = 6;
  var numfactor = Math.pow(10, parseInt(digits - 1));
  var randomNum = Math.floor(Math.random() * numfactor) + 1;
  return randomNum;
};
exports.getNextNumberFromCode = (prefixLength, code) => {
  let codeNumber = 0;
  let strCodeNumber = code.slice(prefixLength, code.length);
  codeNumber = parseInt(strCodeNumber) + 1;
  return codeNumber;
};
exports.getYearMonthNumber = () => {
  let date = new Date(),
    month = "" + (date.getMonth() + 1),
    year = date.getFullYear().toString().substr(-2);

  if (month.length < 2) month = "0" + month;
  return [year, month].join("");
};
exports.AutoGenerateNumber = function (prefix, id, charlength) {
  charlength = charlength || 10;
  let d = new Date(),
    month = "" + (d.getMonth() + 1),
    year = d.getFullYear().toString().substr(-2);
  //,day = '' + d.getDate();

  if (month.length < 2) month = "0" + month;
  //if (day.length < 2) day = '0' + day;

  //var number = [year, month, day].join('');
  let number = [year, month].join("");
  let zero = [];
  if (prefix) {
    number = prefix + number;
  }
  charlength = charlength - number.length;
  for (let i = id.toString().length; i < charlength; i++) {
    zero.push("0");
  }
  if (id) {
    number = [number, zero.join(""), id].join("");
  } else {
    number = [number, zero.join("")].join("");
  }
  return number;
};
//#region nodemailer
// async..await is not allowed in global scope, must use a wrapper
exports.mail = async (email, subject, data) => {
  // create reusable transporter object using the default SMTP transport
  let transporter = await nodemailer.createTransport({
    //
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      //
      user: "info@custom-dnrfk.computerbutler.de",
      pass: "nKtsFFMeBSTaADX8",
    }, //
  });
  var mailOption = {
    from: "sadiquebelforbescommunication@gmail.com",
    to: email,
    subject: subject,
    html: data,
  };
  transporter.sendMail(mailOption, function (error, response) {
    if (error) {
      console.log(error);
      return {
        mailSent: false,
        message: "Email not send",
      };
    } else {
      return {
        mailSent: true,
        message: "Email send",
      };
    }
  });
  // return mailSent;
};
exports.mailer = (email, subject, html) => {
  let smtpObj = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // use SSL
    debug: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const transporter = nodemailer.createTransport(smtpObj);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: subject,
    html: html,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      return error;
    } else {
      console.log("Email sent: " + info.response);
      return info.response;
    }
  });
};
exports.getYearMonthDirectoryNumber = async () => {
  let date = new Date(),
    month = "" + (date.getMonth() + 1),
    year = date.getFullYear().toString();

  if (month.length < 2) month = "0" + month;
  return [year, month];
};
exports.apiCall = async (method, url, data, usedFor = "", userId = "") => {
  if (method === "get") {
    let result;
    if (data) {
      result = await axios.get(url, data);
    } else {
      result = await axios.get(url);
    }
    return result.data.data;
  }
  if (method === "post") {
    // let result = await axios.post(url, { addUserDetails: data });
    // return result.data;

    let result = await axios({
      method: method,
      url: settings.microServiceLink.linkService + "otpSend",
      data: {
        userId: userId,
        info: data.mobile,
        usedFor: usedFor,
      },
    });
    return result.data;
  }
};
exports.formatAMPM = async (hours, minutes) => {
  var ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
};
exports.checkPassword = (str) => {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
};

exports.userTokenValidate = async (token) => {
  try {
    if (!token) {
      return {
        status: 401,
        isSuccess: false,
        message: "Token is not supplied",
      };
    }

    // Check and remove the "Bearer " prefix
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    // Verify the JWT token
    const decoded = await jwt.verify(token, secretOrKey);

    if (!decoded) {
      return {
        isSuccess: false,
        message: "Token is not valid",
      };
    }

    const userDetail = await User.findOne({ _id: decoded.id });
    const userTypeDetail = await UserType.findOne({
      _id: userDetail.userTypeId,
    });

    if (userTypeDetail) {
      decoded.userType = userTypeDetail.userType;
      return decoded;
    } else {
      return {
        isSuccess: false,
        message: "You are not authorized",
        data: {},
      };
    }
  } catch (error) {
    console.error(error);
    return {
      isSuccess: false,
      message: "An error occurred while validating the token",
    };
  }
};
exports.adminTokenValidate = async (token) => {
  if (!token) {
    return {
      status: 401,
      isSuccess: false,
      message: "Token is not supplied",
    };
  }
  if (token) {
    //====Login Authorization
    if (token.startsWith("Bearer ")) {
      // Remove Bearer from token string
      token = token.slice(7, token.length);
    }
    //====JWT Token verification
    const decoded = await jwt.verify(token, secretOrKey);

    if (decoded != null) {
      //#region Check Admin
      const userDetail = await User.findOne({ _id: decoded.id });
      console.log("userDetail", userDetail);
      const userTypeDetail = await UserType.findOne({
        _id: userDetail.userTypeId,
      });

      let userType = null;
      if (_.isEmpty(userTypeDetail) != true) {
        userType = userTypeDetail.userType;
      }
      console.log("common userType===>", userType);
      //#endregion
      if (userType != null) {
        if (userType === "admin" || userType === "superadmin") {
          return decoded;
        } else {
          return {
            isSuccess: false,
            message: "You are not authorised",
            data: {},
          };
        }
      }
    } else {
      return {
        isSuccess: false,
        message: "Token is not valid",
      };
    }
  } else {
    return {
      isSuccess: false,
      message: "Token is not supplied",
    };
  }
};

exports.downloadResource = (fields, data) => {
  const json2csv = new Parser({ fields });
  return json2csv.parse(data);
};

// exports.isUser = async (req, res, next) => {
//   let token = req.headers["authorization"];
//   var decoded = await userTokenValidate(token);
//   if ("isSuccess" in decoded) {
//     res.send(decoded);
//     return;
//   } else {
//     next();
//   }
// };
// const isAdminOrProvider = async (req, res, next) => {
//   let token = req.headers["authorization"];
//   var decoded = await providerTokenValidate(token);
//   if ("isSuccess" in decoded) {
//     res.send(decoded);
//     return;
//   } else {
//     next();
//   }
// };
// module.exports = router;
