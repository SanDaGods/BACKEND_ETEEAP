const express = require("express");
const router = express.Router();
const applicantController = require("../controllers/applicantController");
const { applicantAuthMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/fileUpload");

// Authentication Routes
router.post("/register", applicantController.register);
router.post("/login", applicantController.login);
router.get("/api/auth-status", applicantController.authStatus);
router.get("/applicant/auth-status", applicantController.authStatus); // Keep both for compatibility
router.post("/applicant/logout", applicantController.logout);

// Profile Routes
router.get(
  "/api/profile/:id",
  applicantAuthMiddleware,
  applicantController.profileId
);
router.post(
  "/api/update-profile",
  upload.single("profilePic"),
  applicantController.updateProfile
);
router.get("/api/profile-pic/:userId", applicantController.getProfilePic);

// Document Routes
router.post(
  "/api/submit-documents",
  upload.array("files"),
  applicantController.fileSubmit
);
router.get("/api/fetch-documents/:id", applicantController.fileFetch);
router.delete("/api/delete-documents/:id", applicantController.fileDelete);
router.get(
  "/api/fetch-user-files/:userId",
  applicantAuthMiddleware,
  applicantController.fetchUserFiles
);

// Personal Info Route
router.post("/api/update-personal-info", applicantController.updateInfo);

module.exports = router;