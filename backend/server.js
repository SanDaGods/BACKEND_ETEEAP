require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
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

// CORS configuration - update with your frontend URL
app.use(
  cors({
    origin: [
      "https://frontendeteeap-production.up.railway.app", // Your frontend URL
      "http://localhost:3000" // For local development
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "Authorization"]
  })
);

// OPTIONS handler
app.options('*', cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API routes
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

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: "ETEEAP Tracking System API",
    status: "running",
    frontend: "This is a backend-only deployment. Frontend is served separately."
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

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌐 API endpoints available at: http://localhost:${PORT}/api`);
});