const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
      
      // Validate the applicantId format
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format"
        });
      }

      // Verify this assessor is assigned to this applicant
      const applicant = await Applicant.findById(applicantId);
      if (!applicant) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found"
        });
      }

      if (!applicant.assignedAssessors.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant's documents"
        });
      }

      // Get the MongoDB connection
      const conn = mongoose.connection;
      
      // Query files collection where metadata.owner matches applicantId
      // Try both string and ObjectId formats since we're not sure how it's stored
      const files = await conn.db
        .collection("backupFiles.files")
        .find({
          $or: [
            { "metadata.owner": applicantId }, // Try as string
            { "metadata.owner": new mongoose.Types.ObjectId(applicantId) } // Try as ObjectId
          ]
        })
        .toArray();

      console.log("Found files:", files); // Debug logging

      // Group files by label
      const groupedFiles = {};
      
      files.forEach(file => {
        const label = file.metadata?.label || "others";
        if (!groupedFiles[label]) {
          groupedFiles[label] = [];
        }
        
        // Ensure we have the correct file ID format
        const fileId = file._id instanceof mongoose.Types.ObjectId 
          ? file._id 
          : new mongoose.Types.ObjectId(file._id);
        
        groupedFiles[label].push({
          _id: fileId,
          filename: file.filename,
          contentType: file.contentType,
          uploadDate: file.uploadDate,
          size: file.metadata?.size,
          label: label
        });
      });

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

router.get("/api/debug/files", async (req, res) => {
  try {
    const conn = mongoose.connection;
    const allFiles = await conn.db.collection("backupFiles.files").find().toArray();
    res.json({ success: true, files: allFiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
