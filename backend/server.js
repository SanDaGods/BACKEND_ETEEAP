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

// ✅ Connect to MongoDB
connectDB();

// ✅ Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// ✅ CORS for frontend + backend domains
app.use(
  cors({
    origin: [
      "https://frontendeteeap-production.up.railway.app",
      "http://localhost:3000",
      "https://updated-backend-production-ff82.up.railway.app",
      "https://backendeteeap-production.up.railway.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "Authorization"]
  })
);

// ✅ Allow preflight for all routes
app.options("*", cors());

// ✅ Serve static frontend files (landing page)
const staticPath = path.join(__dirname, "frontend", "client", "applicant", "home");
app.use(express.static(staticPath));

// ✅ API Routes
app.use("/", routes, applicants, assessors, admins);

// ✅ Health check
app.get("/health", (req, res) => {
  mongoose.connection.db.admin().ping((err) => {
    if (err) return res.status(503).json({ db: "disconnected" });
    res.json({
      db: "connected",
      gridfs: typeof gfs !== "undefined" ? "ready" : "not initialized"
    });
  });
});

// ✅ Logger for incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// ✅ Fallback to index.html for unknown routes (for SPA deep links or home page)
app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
