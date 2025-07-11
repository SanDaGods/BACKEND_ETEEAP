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

// CORS configuration
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

// OPTIONS handler
app.options('*', cors());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend', 'client', 'applicant', 'home')));
app.use(express.static(path.join(__dirname, 'frontend', 'client', 'applicant', 'home', 'assets'))); // If you have an assets folder

// Serve index.html for the root route
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'frontend', 'client', 'applicant', 'home', 'index.html'));
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).send('Error loading landing page');
  }
});

// API routes - prefixed with /api to avoid conflicts
app.use("/api", routes);
app.use("/api/applicants", applicants);
app.use("/api/admins", admins);
app.use("/api/assessors", assessors);

// Health check endpoint
app.get('/health', (req, res) => {
  mongoose.connection.db.admin().ping((err) => {
    if (err) return res.status(503).json({ db: 'disconnected' });
    res.json({ 
      db: 'connected',
      status: 'healthy'
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Landing page should be available at: http://localhost:${PORT}`);
  console.log(`Static files path: ${path.join(__dirname, 'frontend', 'client', 'applicant', 'home')}`);
});