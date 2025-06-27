const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Applicant = require("../models/applicantModel");
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
  "/api/assessor/applicants/:id",
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

      const applicant = await Applicant.findById(applicantId)
        .select("-password") // Exclude sensitive data
        .lean();

      if (!applicant) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found",
        });
      }

      // Verify assessor is assigned to this applicant
      if (!applicant.assignedAssessors?.includes(req.assessor.userId)) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to view this applicant",
        });
      }

      res.json({
        success: true,
        data: applicant
      });
    } catch (error) {
      console.error("Error fetching applicant data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch applicant data",
      });
    }
  }
);

// Updated documents route
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

      // Verify applicant exists and assessor is assigned
      const applicant = await Applicant.findOne({
        _id: applicantId,
        assignedAssessors: req.assessor.userId
      });

      if (!applicant) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found or not authorized",
        });
      }

      // Check both collections (fs.files and backupFiles.files)
      const collections = ["fs.files", "backupFiles.files"];
      let files = [];

      for (const collection of collections) {
        const collectionExists = await mongoose.connection.db.listCollections({ name: collection }).hasNext();
        if (collectionExists) {
          const foundFiles = await mongoose.connection.db
            .collection(collection)
            .find({
              "metadata.owner": mongoose.Types.ObjectId(applicantId)
            })
            .toArray();
          files = [...files, ...foundFiles];
        }
      }

      if (files.length === 0) {
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
