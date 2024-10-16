const express = require("express");
const router = express.Router();

const { share } = require("../../controllers/Share/shareController");

// Generic Share Route: GET /share/:type/:id
router.get("/:type/:id", share);
exports.router = router;
