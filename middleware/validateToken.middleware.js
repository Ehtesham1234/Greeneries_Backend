const jwt = require("jsonwebtoken");
const { User } = require("../models/User.models");

// Middleware for verifying token
exports.verifyToken = (role) => async (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(403).send("A token is required for authentication");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate("role");
    if (!user || user.role.name !== role)
      return res.status(401).send("Invalid role");
    // req.user = decoded;
    console.log("user.role.name"), user.role.name;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
};
