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

// Update CORS configuration
app.use(
  cors({
    origin: [
      "https://frontendeteeap-production.up.railway.app",
      "http://localhost:3000",
      "https://updated-backend-production-ff82.up.railway.app",
      "https://backendeteeap-production.up.railway.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Added PATCH here
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "Authorization"]
  })
);

// Ensure OPTIONS handler is properly configured
app.options('*', cors());

// ✅ Routes
app.use("/", routes, applicants, assessors, admins);

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

// Add this before your routes
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Add this after your routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.get('/health', (req, res) => {
  mongoose.connection.db.admin().ping((err) => {
    if (err) return res.status(503).json({ db: 'disconnected' });
    res.json({ 
      db: 'connected',
      gridfs: gfs ? 'ready' : 'not initialized'
    });
  });
});

// Add this after your middleware but before your API routes
app.use(express.static(path.join(__dirname, 'frontend', 'client', 'applicant', 'home')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'client', 'applicant', 'home', 'index.html'));
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});