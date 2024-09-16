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
const Message = require("./models/Message.models");
const appRoute = require("./routes/App/appRoutes");
const messageRoute = require("./routes/message/messageRoutes");
const cors = require("cors");
const path = require("path");
const { dirname } = require("path");
const passport = require("passport");
const { engine } = require("express-handlebars");
const cookieParser = require("cookie-parser");
const { ApiError } = require("./utils/ApiError");
const http = require("http");
const { Server } = require("socket.io");
const { handleSocketConnection } = require("./services/socket");
connectDB();
//
const app = express();
const server = http.createServer(app);
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
app.use(express.json({ limit: "50mb" })); // Adjust the limit as needed
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Remember to use secure cookies
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
app.use("/api", messageRoute.router);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});
handleSocketConnection(io); // Use the socket logic from the new file

// Serve index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    console.error("Internal Server Error:", err);
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  } else {
    console.error("Internal Server Error:", err);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: err.message, // Include the error message
      stack: err.stack, // Include the stack trace (optional)
    });
  }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));
