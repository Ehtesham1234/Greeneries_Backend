const nodemailer = require("nodemailer");
const path = require("path");
const hbs = require("nodemailer-express-handlebars");

const handlebarsOptions = {
  viewEngine: {
    extName: ".handlebars",
    partialsDir: path.resolve("./views"),
    defaultLayout: false,
  },
  viewPath: path.resolve("./views"),
  extName: ".handlebars",
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "ehteshamscience12344321@gmail.com",
    pass: "Etes1209111@",
  },
});

transporter.use("compile", hbs(handlebarsOptions));

// mail sender
exports.mailSender = async (req, res, otp, name, email) => {
  const mailOptions = {
    from: "ehteshamscience12344321@gmail.com",
    to: email,
    subject: "Email Verification for DYNO",
    template: "email",
    context: {
      otp: otp,
      name: name,
    },
  };
  transporter.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log("Email not send", error);
    } else {
      console.log("mail sent");
    }
  });
};
