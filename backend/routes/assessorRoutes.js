const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const assessorController = require("../controllers/assessorController");
const { assessorAuthMiddleware } = require("../middleware/authMiddleware");
const { GridFSBucket, ObjectId } = require("mongodb");
const conn = mongoose.connection;

let gfs;
conn.once("open", () => {
  gfs = new GridFSBucket(conn.db, {
    bucketName: "backupFiles",
  });
});

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


// New routes for applicant file access
router.get(
  "/api/applicants/:applicantId/files",
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

      // Verify assessor is assigned to this applicant
      const isAssigned = await assessorController.verifyAssessorAssignment(
        req.user._id,
        applicantId
      );

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this applicant's files",
        });
      }

      const files = await conn.db
        .collection("backupFiles.files")
        .find({
          "metadata.owner": new mongoose.Types.ObjectId(applicantId),
        })
        .toArray();

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
        files: groupedFiles,
      });
    } catch (error) {
      console.error("Error fetching applicant files:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch applicant files",
        details: error.message,
      });
    }
  }
);

// Get a specific file
router.get(
  "/api/applicants/:applicantId/files/:fileId",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const { applicantId, fileId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(applicantId) ||
        !mongoose.Types.ObjectId.isValid(fileId)
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid ID format",
        });
      }

      // Verify assessor is assigned to this applicant
      const isAssigned = await assessorController.verifyAssessorAssignment(
        req.user._id,
        applicantId
      );

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this file",
        });
      }

      const fileIdObj = new ObjectId(fileId);
      const file = await conn.db.collection("backupFiles.files").findOne({
        _id: fileIdObj,
        "metadata.owner": new mongoose.Types.ObjectId(applicantId),
      });

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const downloadStream = gfs.openDownloadStream(fileIdObj);

      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.filename}"`);

      downloadStream.pipe(res);

      downloadStream.on("error", (error) => {
        console.error("Error streaming file:", error);
        res.status(500).json({ error: "Error streaming file" });
      });
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  }
);

module.exports = router;


