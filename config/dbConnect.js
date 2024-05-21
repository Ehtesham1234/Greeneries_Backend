const mongoose = require("mongoose");

exports.connectDB = async () => {
  mongoose.connect(process.env.Monfodb_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "MongoDB connection error:"));
  db.once("open", () => {
    console.log("Connected to MongoDB");
  });
};
