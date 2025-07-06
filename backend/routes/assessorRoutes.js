const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const assessorController = require("../controllers/assessorController");
const { assessorAuthMiddleware } = require("../middleware/authMiddleware");
const { GridFSBucket, ObjectId } = require("mongodb");
const conn = mongoose.connection;

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

// New DELETE endpoint for applicants
router.delete(
  "/api/assessor/applicants/:id",
  assessorAuthMiddleware,
  assessorController.deleteApplicant
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

router.get(
  "/api/assessor/fetch-documents/:fileId",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const isDownload = req.query.download === 'true';
      
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid file ID format",
        });
      }

      const file = await conn.db
        .collection("backupFiles.files")
        .findOne({ _id: new ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }

      // Set appropriate headers
      res.set("Content-Type", file.contentType);
      
      if (isDownload) {
        res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
      } else {
        res.set("Content-Disposition", `inline; filename="${file.filename}"`);
      }

      const bucket = new GridFSBucket(conn.db, {
        bucketName: "backupFiles",
      });

      const downloadStream = bucket.openDownloadStream(file._id);
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch document",
      });
    }
  }
);

module.exports = router;


