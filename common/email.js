const nodemailer = require("nodemailer");
const path = require("path");
const hbs = require("nodemailer-express-handlebars");

const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Twilio account SID
const authToken = process.env.TWILIO_AUTH_TOKEN; // Your Twilio auth token
const client = twilio(accountSid, authToken);

const handlebarsOptions = {
  viewEngine: {
    extName: ".handlebars",
    partialsDir: "views",
    layoutsDir: "views",
    defaultLayout: "email",
  },
  viewPath: "views",
  extName: ".handlebars",
};

let transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: false,
  auth: {
    user: "tiadsforme@gmail.com",
    pass: "jkhgvpxcarwuianv",
  },
});

transporter.use("compile", hbs(handlebarsOptions));

// mail sender
const otpSender = async (identifier, otp, userName) => {
  // console.log("identifier", identifier);
  if (identifier?.includes("@")) {
    const mailOptions = {
      from: `"BlossyLeaf" <ehteshamscience12344321@gmail.com>`,
      to: identifier,
      subject: "Email Verification for BlossyLeaf",
      template: "email",
      context: {
        otp: otp,
        name: userName,
      },
    };
    transporter.sendMail(mailOptions, function (error, response) {
      if (error) {
        console.log("Email not sent", error);
      } else {
        console.log("Mail sent");
      }
    });
  } else {
    client.messages
      .create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: identifier,
      })
      .then((message) => console.log(message.sid))
      .catch((err) => console.error(err));
  }
};

module.exports = { otpSender };
