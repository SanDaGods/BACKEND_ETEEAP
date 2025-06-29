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
    console.log('Starting documents fetch for applicant:', req.params.id); // Debug
    try {
      const applicantId = req.params.id;
      
      // Validate the applicantId format
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        console.log('Invalid applicant ID format:', applicantId); // Debug
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format"
        });
      }

      // Convert to ObjectId
      const applicantObjectId = new mongoose.Types.ObjectId(applicantId);
      console.log('Converted to ObjectId:', applicantObjectId); // Debug
      
      // Verify this assessor is assigned to this applicant
      const applicant = await Applicant.findById(applicantObjectId);
      if (!applicant) {
        console.log('Applicant not found:', applicantObjectId); // Debug
        return res.status(404).json({
          success: false,
          error: "Applicant not found"
        });
      }

      if (!applicant.assignedAssessors.includes(req.user._id)) {
        console.log('Assessor not authorized:', req.user._id); // Debug
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant's documents"
        });
      }

      // Get the MongoDB connection
      const conn = mongoose.connection;
      console.log('MongoDB connection established'); // Debug
      
      // First verify the collection exists
      const collections = await conn.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name)); // Debug
      
      // Query files collection where metadata.owner matches applicantId
      const filesCollection = conn.db.collection("backupFiles.files");
      console.log('Files collection accessed'); // Debug

      // Try multiple query formats
      const query = {
        $or: [
          { "metadata.owner": applicantId }, // As string
          { "metadata.owner": applicantObjectId }, // As ObjectId
          { "metadata.owner": applicantObjectId.toString() } // As stringified ObjectId
        ]
      };
      console.log('Query being used:', JSON.stringify(query)); // Debug

      const files = await filesCollection.find(query).toArray();
      console.log('Files found:', files.length); // Debug

      if (!files || files.length === 0) {
        console.log('No files found for applicant'); // Debug
        return res.json({
          success: true,
          files: {}
        });
      }

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

      console.log('Grouped files:', Object.keys(groupedFiles)); // Debug
      res.json({
        success: true,
        files: groupedFiles
      });
    } catch (error) {
      console.error("Detailed error fetching documents:", error);
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
