require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const fs = require("fs");

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

// Debugging middleware - log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Set the correct path to your frontend files
const frontendPath = path.resolve(__dirname, 'frontend', 'client', 'applicant', 'home');
console.log(`Frontend absolute path: ${frontendPath}`);

// Verify the path exists
if (!fs.existsSync(frontendPath)) {
  console.error('❌ ERROR: Frontend directory does not exist at:', frontendPath);
  console.log('Current working directory:', process.cwd());
  console.log('Directory contents:', fs.readdirSync(path.resolve(__dirname, 'frontend')));
} else {
  console.log('✅ Frontend directory exists at:', frontendPath);
  console.log('Directory contents:', fs.readdirSync(frontendPath));
}

// Serve static files from the frontend directory
app.use(express.static(frontendPath, {
  extensions: ['html', 'htm'] // Auto-serve .html files
}));

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

// Serve index.html for all non-API GET requests
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  console.log(`Attempting to serve index.html from: ${indexPath}`);
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ ERROR: index.html not found at:', indexPath);
    return res.status(404).json({
      error: 'index.html not found',
      absolutePath: indexPath,
      currentDir: __dirname,
      dirContents: fs.readdirSync(frontendPath)
    });
  }

  try {
    res.sendFile(indexPath);
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).json({
      error: 'Error loading application',
      message: err.message
    });
  }
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Landing page should be available at: http://localhost:${PORT}`);
  console.log(`📁 Static files path: ${frontendPath}`);
});