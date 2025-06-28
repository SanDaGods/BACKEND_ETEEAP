const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Applicant = require('../models/Applicant');
const assessorController = require("../controllers/assessorController");
const { assessorAuthMiddleware } = require("../middleware/authMiddleware");

router.post("/assessor/register", assessorController.createAssessor);
router.post("/assessor/login", assessorController.login);
router.get(
  "/assessor-dashboard",
  assessorAuthMiddleware,
  assessorController.dashboard
);
router.get("/assessor/auth-status", assessorController.authstatus);
router.post("/assessor/logout", assessorController.logout);
router.get(
  "/api/assessor/applicants",
  assessorAuthMiddleware,
  assessorController.fetchApplicant
);
router.get(
  "/api/assessor/applicants/:id",
  assessorAuthMiddleware,
  assessorController.fetchApplicant2
);
router.get(
  "/api/assessor/applicant-documents/:applicantId",
  assessorAuthMiddleware,
  assessorController.files
);
router.get(
  "/api/evaluations",
  assessorAuthMiddleware,
  assessorController.evaluations
);
router.post(
  "/api/evaluations",
  assessorAuthMiddleware,
  assessorController.evaluations2
);
router.post(
  "/api/evaluations/finalize",
  assessorAuthMiddleware,
  assessorController.finalize
);
router.get(
  "/api/evaluations/applicant/:applicantId",
  assessorAuthMiddleware,
  assessorController.fetchEvaluation
);

router.get(
  "/api/assessor/applicants/:id/documents",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const applicantId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format",
        });
      }

      // Verify the applicant exists and is assigned to this assessor
      const applicant = await Applicant.findById(applicantId).lean();
      if (!applicant) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found",
        });
      }

      // Check if the current assessor is assigned to this applicant
      const isAssigned = applicant.assignedAssessors?.some(
        assessorId => assessorId.toString() === req.user._id.toString()
      );
      
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant's documents",
        });
      }

      const conn = mongoose.connection;
      const files = await conn.db
        .collection("backupFiles.files")
        .find({
          "metadata.owner": applicantId,
        })
        .toArray();

      // Group files by label
      const groupedFiles = files.reduce((acc, file) => {
        const label = file.metadata?.label || "others";
        acc[label] = acc[label] || [];
        acc[label].push({
          _id: file._id,
          filename: file.filename,
          contentType: file.contentType,
          uploadDate: file.uploadDate,
          size: file.metadata?.size,
          label: label,
        });
        return acc;
      }, {});

      res.json({
        success: true,
        files: groupedFiles
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch documents",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
