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

// server.js
const cors = require("cors");

// ✅ Configure CORS properly
const corsOptions = {
  origin: [
    "https://frontendeteeap-production.up.railway.app",
    "http://localhost:3000",
  ],
  credentials: true, // Allow cookies/tokens
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Explicitly allow OPTIONS
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // Legacy browsers choke on 204
};

app.use(cors(corsOptions)); // Apply globally



// ✅ Routes
// server.js - Update the routes section
const authRoutes = require("./routes/authRoutes"); // Make sure this is imported

// Mount routes like this:
app.use("/api", routes); // Your base API routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/applicant", applicants); // All applicant routes
app.use("/api/assessor", assessors); // All assessor routes
app.use("/api/admin", admins); // All admin routes

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});