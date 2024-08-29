const express = require("express");
const createError = require("http-errors");
const morgan = require("morgan");
const session = require("express-session");
require("dotenv").config();
const { connectDB } = require("./config/dbConnect");
const userRoute = require("./routes/Users/usersRoutes");
const shopRoute = require("./routes/shop/shopRoutes");
const superAdminRoute = require("./routes/Users/superAdminRoutes");
const roleRoute = require("./routes/roles/rolesRoute");
const productRoutes = require("./routes/product/productRoutes");
const oAuthRoutes = require("./routes/Users/oAuthRoutes");
const Role = require("./models/roles/roles.models");
const appRoute = require("./routes/App/appRoutes");
const City = require("./models/City.model");
const State = require("./models/State.model");
const cityArray = require("./utils/city");
const stateArray = require("./utils/state");
const cors = require("cors");
const path = require("path");
const { dirname } = require("path");
const passport = require("passport");
const { engine } = require("express-handlebars");
const cookieParser = require("cookie-parser");
const { ApiError } = require("./utils/ApiError");
connectDB();

const app = express();

const roles = [
  { id: 1, name: "superadmin" },
  { id: 2, name: "admin" },
  { id: 3, name: "user" },
];
console.log(Role);
Role.countDocuments({})
  .exec()
  .then((count) => {
    if (count === 0) {
      return Role.insertMany(roles);
    } else {
      console.log("Role already exist in database");
    }
  })
  .then(() => {
    console.log("Roles inserted successfully");
  })
  .catch((error) => {
    console.log("error", error);
  });

// insert states
State.countDocuments({})
  .exec()
  .then((count) => {
    if (count === 0) {
      insertStateData(stateArray);
    } else {
      console.log("States already exist in the database.");
    }
  })

  .catch((err) => {
    console.error("Error:", err);
  })
  .finally(() => {});

// insert city
City.countDocuments({})
  .exec()
  .then((count) => {
    if (count === 0) {
      insertCityData(cityArray);
    } else {
      console.log("cities already exist in the database.");
    }
  })

  .catch((err) => {
    console.error("Error:", err);
  })
  .finally(() => {});

// insert state data in state table
const insertStateData = async (data) => {
  try {
    // Insert the data into the 'state' collection
    await State.insertMany(data);
    console.log("State Data inserted successfully");
  } catch (error) {
    console.error("Error inserting State data:", error);
  }
};

// insert city data in table
const insertCityData = async (cityData) => {
  try {
    // Insert the data into the 'city' collection
    await City.insertMany(cityData);
    console.log("City data inserted successfully");
  } catch (error) {
    console.error("Error inserting city data:", error);
  }
};

// delete all state
const deleteAllStateData = async () => {
  try {
    // Delete all documents from the 'state' collection
    await State.deleteMany({});
    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Error deleting data:", error);
  }
};

// delete all city
const deleteAllCityData = async () => {
  try {
    // Delete all documents from the 'state' collection
    await City.deleteMany({});
    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Error deleting data:", error);
  }
};

// Set CORS headers to allow requests from http://127.0.0.1:5173
app.use(
  cors({
    origin: "http://127.0.0.1:5173",
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(express.static("public"));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// app.use(passport.initialize());
// app.use(passport.session());
// Configure Express Handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
// Set views directory
app.set("views", path.join(__dirname, "views"));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Remember to use secure cookies
  })
);

//sales k trending k liye 24 hours cron
// require("./services/cronJobs");

// app.use("/api", require("./routes/api.route"));
app.use("/api", userRoute.router);
app.use("/api", appRoute.router);
app.use("/api", superAdminRoute.router);
app.use("/api", shopRoute.router);
app.use("/api/roles", roleRoute.router);
app.use("/api", productRoutes.router);
app.use("/google", oAuthRoutes.router);
//Roles

app.use((req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  } else {
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: err.message, // Include the error message
      stack: err.stack, // Include the stack trace (optional)
    });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));
