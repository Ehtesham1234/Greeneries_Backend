const express = require("express");
const rolesController = require("../../controllers/roles/rolesController");

const router = express.Router();

router.post("/updateCapability", rolesController.updateCapability);

exports.router = router;
