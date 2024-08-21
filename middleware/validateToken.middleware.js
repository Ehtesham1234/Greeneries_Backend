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

  console.log("token", token);
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).populate("role");
    if (!user || user.role.name !== role) {
      return res.status(401).send("Invalid role or user not found");
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(401).send(`Invalid Token: ${err.message}`);
  }
};
