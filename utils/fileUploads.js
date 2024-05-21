const fs = require("fs");
const twilio = require("twilio");
const nodemailer = require("nodemailer");

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Twilio account SID
const authToken = process.env.TWILIO_AUTH_TOKEN; // Your Twilio auth token
const client = twilio(accountSid, authToken);

// File Size Formatter
const fileSizeFormatter = (bytes, decimal) => {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const dm = decimal || 2;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "YB", "ZB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1000));
  return (
    parseFloat((bytes / Math.pow(1000, index)).toFixed(dm)) + " " + sizes[index]
  );
};

const sendOtp = async (identifier, otp) => {
  console.log("identifier", identifier);
  // Check if identifier is an email
  if (identifier?.includes("@")) {
    // Create a transporter
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", // replace with your email provider
      port: 587,
      auth: {
        user: "leonie66@ethereal.email",
        pass: "uTbDvuPfhvkN91k8AW",
      },
    });

    // Send email
    let info = await transporter.sendMail({
      from: process.env.EMAIL_USERNAME, // sender address
      to: identifier, // list of receivers
      subject: "Your OTP", // Subject line
      text: `Your OTP is ${otp}`, // plain text body
    });

    console.log("Message sent: %s", info.messageId, identifier, otp);
  } else {
    // Send SMS
    client.messages
      .create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
        to: identifier,
      })
      .then((message) => console.log(message.sid))
      .catch((err) => console.error(err));
  }
};
module.exports = { fileSizeFormatter, sendOtp };
