const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { adminAuthMiddleware } = require("../middleware/authMiddleware");

router.post("/admin/register", adminController.createAdmin);
router.post("/admin/login", adminController.login);
router.get("/admin/auth-status", adminController.authstatus);
router.post("/admin/logout", adminController.logout);
router.get("/admin/dashboard", adminAuthMiddleware, adminController.dashboard);
router.get(
  "/api/admin/applicants",
  adminAuthMiddleware,
  adminController.fetchApplicant
);
router.get(
  "/api/admin/applicants/:id",
  adminAuthMiddleware,
  adminController.fetchApplicantInfo
);
router.post(
  "/api/admin/applicants/:id/approve",
  adminAuthMiddleware,
  adminController.approveApplicant
);
router.post(
  "/api/admin/applicants/:id/reject",
  adminAuthMiddleware,
  adminController.disapproveApplicant
);
router.post(
  "/api/admin/applicants/:id/assign-assessor",
  adminAuthMiddleware,
  adminController.assignAssessor
);
router.get(
  "/api/admin/available-assessors",
  adminAuthMiddleware,
  adminController.availableAsessor
);
router.get(
  "/api/admin/dashboard-stats",
  adminAuthMiddleware,
  adminController.dashboard
);
router.post(
  "/assessor/all",
  adminAuthMiddleware,
  adminController.getallAssessor
);
router.get(
  "/assessor/:id",
  adminAuthMiddleware,
  adminController.getAssessorInfo
);
router.put(
  "/assessor/:id",
  adminAuthMiddleware,
  adminController.updateAssessor
);
router.delete(
  "/assessor/:id",
  adminAuthMiddleware,
  adminController.deleteAssessor
);
router.get(
  "/api/assessor/:id/applicants",
  adminAuthMiddleware,
  adminController.fetchAssessorApplicants
);
router.get(
  "/api/admin/evaluations",
  adminAuthMiddleware,
  adminController.fetchEvaluation
);
router.get(
  "/api/admin/evaluations/:id",
  adminAuthMiddleware,
  adminController.fetchEvaluationID
);

router.get(
  "/api/admin/admins",
  adminAuthMiddleware,
  adminController.fetchAdmins
);

router.get(
  "/api/admin/admins/:id",
  adminAuthMiddleware,
  adminController.fetchAdminID
);

router.put(
  "/api/admin/admins/:id",
  adminAuthMiddleware,
  adminController.updateAdmin
);
router.delete(
  "/api/admin/admins/:id",
  adminAuthMiddleware,
  adminController.deleteAdmin
);
router.put(
  "/api/admin/admins/:id/change-password",
  adminAuthMiddleware,
  adminController.changepassAdmin
);

router.get(
  "/api/admin/applicants/:id/documents",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const applicantId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(applicantId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid applicant ID format",
        });
      }

      // Get the MongoDB connection from mongoose
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

module.exports = router;
