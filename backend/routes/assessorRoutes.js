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


router.get(
  "/api/assessor/documents/:fileId",
  assessorAuthMiddleware,
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      // Validate fileId
      if (!ObjectId.isValid(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const bucket = new GridFSBucket(conn.db, {
        bucketName: "backupFiles"
      });

      const file = await conn.db.collection("backupFiles.files").findOne({
        _id: new ObjectId(fileId)
      });

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Check if the assessor has permission to access this file
      // (You might want to add additional checks here)
      
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.filename}"`);

      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  }
);

module.exports = router;


