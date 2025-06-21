const express = require("express");
const router = express.Router();
const applicantController = require("../controllers/applicantController");
const { applicantAuthMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/fileUpload");

// Applicant-specific routes (all prefixed with /api/applicant when mounted)
router.post(
  "/submit-documents",
  upload.array("files"),
  applicantController.fileSubmit
);
router.get("/fetch-documents/:id", applicantController.fileFetch);
router.get("/delete-documents/:id", applicantController.fileDelete);
router.post("/update-personal-info", applicantController.updateInfo);
router.get(
  "/profile/:id",
  applicantAuthMiddleware,
  applicantController.profileId
);
router.get("/auth-status", applicantController.authStatus);
router.post("/logout", applicantController.logout);
router.get(
  "/fetch-user-files/:userId",
  applicantAuthMiddleware,
  applicantController.fetchUserFiles
);
router.post("/update-profile", upload.single("file"), applicantController.updateProfile);
router.get("/profile-pic/:userId", applicantController.getProfilePic);

module.exports = router;