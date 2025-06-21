require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const connectDB = require("./config/db");
const { PORT } = require("./config/constants");
const routes = require("./routes");
const applicants = require("./routes/applicantRoutes");
const admins = require("./routes/adminRoutes");
const assessors = require("./routes/assessorRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// ✅ **FIXED CORS CONFIGURATION**
// In server.js, update the CORS configuration:
app.use(
  cors({
    origin: [
      "https://frontendeteeap-production.up.railway.app",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Add this before your routes to handle preflight requests
app.options('*', cors());

// ✅ Routes
// ✅ Mount all routes with proper prefixes
app.use("/api", routes); // Main routes
app.use("/api/applicant", applicants); // Applicant routes
app.use("/api/admin", admins); // Admin routes
app.use("/api/assessor", assessors); // Assessor routes

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ✅ Error handling middleware
// Add this before your routes
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Update your error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON payload"
    });
  }
  
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});