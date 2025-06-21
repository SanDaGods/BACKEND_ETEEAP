// authRoute.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST /api/auth/register
router.post("/register", authController.register);

// POST /api/auth/login
router.post("/login", authController.login);

router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Ping successful" });
});

module.exports = router;