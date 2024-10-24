const express = require("express");
const router = express.Router();
const plantProgressController = require("../../controllers/plantProgressController");
const { verifyToken } = require("../../middleware/validateToken.middleware");

const verifyUser = verifyToken("user");

router
  .get("/assessment-questions", plantProgressController.getInitialQuestions)
  .post(
    "/assess/:purchaseId",
    verifyUser,
    plantProgressController.submitInitialAssessment
  )
  .get(
    "/progress/:purchaseId",
    verifyUser,
    plantProgressController.getPlantProgress
  )
  .get(
    "/daily-task/:purchaseId",
    verifyUser,
    plantProgressController.getDailyTask
  )
  .post(
    "/complete-task/:purchaseId",
    verifyUser,
    plantProgressController.completeTask
  )
  .post(
    "/report-issue/:purchaseId",
    verifyUser,
    plantProgressController.reportIssue
  )
  .post(
    "/update-height/:purchaseId",
    verifyUser,
    plantProgressController.updatePlantHeight
  );

exports.router = router;
