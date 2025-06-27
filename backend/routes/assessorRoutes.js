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
// Update the documents route in assessorRoute.js
router.get(
  "/api/assessor/applicants/:id/documents",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const applicantId = req.params.id;
      const Applicant = require("../models/applicantModel"); // Make sure to import the Applicant model
      
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format",
        });
      }

      // Verify the assessor is assigned to this applicant
      const isAssigned = await Applicant.findOne({
        _id: applicantId,
        assignedAssessors: req.assessor.userId
      });

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant's documents",
        });
      }

      // Use GridFS to fetch files
      const files = await mongoose.connection.db
        .collection("fs.files")
        .find({
          "metadata.owner": new mongoose.Types.ObjectId(applicantId)
        })
        .toArray();

      if (!files || files.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No documents found for this applicant",
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
          size: file.length,
          label: label,
          category: file.metadata?.category
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

module.exports = router;
