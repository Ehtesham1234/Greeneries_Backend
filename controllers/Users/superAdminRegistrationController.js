const { User } = require("../../models/User.models");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { Role } = require("../../models/roles/roles.models");

const jwt = require("jsonwebtoken");

exports.userRegistration = async (req, res, nex) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userName, email, password } = req.body;

    if (!userName) {
      return res.json({
        error: "name is required",
      });
    }
    //checking if password is valid
    if (!password || password.length < 6) {
      return res.json({
        error: "password is invalid it should be six or more than six digits",
      });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ message: "User already exists ,Please Sign In" });
    }

    const roleObject = await Role.findOne({ id: 1 });
    console.log("roleObject", roleObject);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to database with status unverified
    const user = new User({
      userName,
      email,
      password: hashedPassword,
      isPhoneVerified: true,
      role: roleObject._id,
    });
    await user.save();
    res
      .status(201)
      .json({ message: "Super admin registration complete" }, "User", user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// sign In

exports.userSignIn = async (req, res, nex) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find the user by their phone
    const user = await User.findOne({ email }).populate("role");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // User is logged in successfully
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    await user.save();

    // Create a new object with only the properties you want to send
    let userWithoutPassword = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      userId: user.userId,
      role: user.role,
      isActive: user.isActive,
      token: token,
    };

    // Respond with the token and user information
    res.cookie("token", token, {
      httpOnly: true,
    });

    return res
      .status(201)
      .json({ message: "Success", data: userWithoutPassword });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

//getting details of users
exports.getuserRegistration = async (req, res) => {
  try {
    const email = req.params.num;
    const registration = await User.find({ email }).populate("role");
    return res.status(201).json(registration);
    // res.status(201).json(res.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
