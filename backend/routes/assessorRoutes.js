const express = require("express");
const router = express.Router();
const assessorController = require("../controllers/assessorController");
const { assessorAuthMiddleware } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Applicant = require("../models/applicantModel"); // Make sure you have this model

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


// Add this route to assessorRoute.js
router.get(
  "/api/assessor/applicant-documents/:applicantId",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const applicantId = req.params.applicantId;
      
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format",
        });
      }

      // Get the MongoDB connection from mongoose
      const conn = mongoose.connection;
      
      // First verify the assessor is assigned to this applicant
      const applicant = await Applicant.findById(applicantId);
      if (!applicant) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found",
        });
      }

      // Check if the current assessor is assigned to this applicant
      if (applicant.assignedAssessor.toString() !== req.assessor._id.toString()) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant's documents",
        });
      }

      const files = await conn.db
        .collection("backupFiles.files")
        .find({
          "metadata.owner": applicantId,
        })
        .toArray();

      // Group files by label
      const groupedFiles = files.reduce((acc, file) => {
        const label = file.metadata?.label || "others";
        if (!acc[label]) {
          acc[label] = [];
        }
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
      console.error("Error fetching applicant documents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch documents",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Add this route to assessorRoute.js
router.get(
  "/api/fetch-documents/:fileId",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid file ID format",
        });
      }

      const conn = mongoose.connection;
      const file = await conn.db
        .collection("backupFiles.files")
        .findOne({ _id: new mongoose.Types.ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }

      // Verify the assessor has access to this file
      const applicant = await Applicant.findById(file.metadata.owner);
      if (!applicant || applicant.assignedAssessor.toString() !== req.assessor._id.toString()) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this file",
        });
      }

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: "backupFiles",
      });

      const downloadStream = bucket.openDownloadStream(file._id);
      
      // Set appropriate headers
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.filename}"`);
      
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch document",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
