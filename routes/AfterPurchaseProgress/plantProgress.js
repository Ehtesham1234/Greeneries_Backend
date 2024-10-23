const express = require("express");
const router = express.Router();
const plantProgressController = require("../../controllers/AfterPurchaseProgress/plantProgressController");
const { verifyToken } = require("../../middleware/validateToken.middleware");
const verifyUser = verifyToken("user");

router
  .get("/:purchaseId", plantProgressController.getPlantProgress)
  .get("/daily-task/:purchaseId", plantProgressController.getDailyTask)
  .post("/complete-task/:purchaseId", plantProgressController.completeTask);

exports.router = router;
