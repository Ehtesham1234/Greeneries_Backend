const jwt = require("jsonwebtoken");
const User = require("../models/User.models");

// Middleware for verifying token
exports.verifyToken = (role) => async (req, res, next) => {
  let token = req.cookies.token || req.body.token;
  if (
    !token &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).populate("role");
    if (!user) {
      return res.status(404).send("User not found");
    }
    if (user.role.name !== role) {
      return res.status(403).send("Invalid role");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token has expired");
    }
    console.error("Token verification error:", err);
    return res.status(403).send(`Invalid Token: ${err.message}`);
  }
};

exports.socketAuth = () => async (socket, next) => {
  let token = socket.handshake.query.token;

  if (!token) {
    return next(new Error("A token is required for authentication"));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).populate("role");
    if (!user) {
      return next(new Error("User not found"));
    }
    // if (user.role.name !== role) {
    //   return next(new Error("Invalid role"));
    // }

    socket.user = user; // Attach the user to the socket object
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new Error("Token has expired"));
    }
    console.error("Token verification error:", err);
    return next(new Error(`Invalid Token: ${err.message}`));
  }
};
