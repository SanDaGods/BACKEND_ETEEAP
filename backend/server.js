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

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 1. First try: Assume frontend is in ../frontend (if server.js is in backend folder)
let frontendPath = path.resolve(__dirname, '..', 'frontend', 'client', 'applicant', 'home');
console.log(`Trying frontend path (option 1): ${frontendPath}`);

if (!fs.existsSync(frontendPath)) {
  console.log('Path not found, trying alternative locations...');
  
  // 2. Second try: Assume frontend is in ./frontend (if server.js is in root)
  frontendPath = path.resolve(__dirname, 'frontend', 'client', 'applicant', 'home');
  console.log(`Trying frontend path (option 2): ${frontendPath}`);
  
  if (!fs.existsSync(frontendPath)) {
    // 3. Third try: Absolute path from project root
    frontendPath = path.resolve(process.cwd(), 'frontend', 'client', 'applicant', 'home');
    console.log(`Trying frontend path (option 3): ${frontendPath}`);
    
    if (!fs.existsSync(frontendPath)) {
      console.error('❌ ERROR: Could not locate frontend directory at any standard location');
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
      console.log('Contents of project root:', fs.readdirSync(process.cwd()));
    }
  }
}

if (fs.existsSync(frontendPath)) {
  console.log('✅ Found frontend directory at:', frontendPath);
  console.log('Directory contents:', fs.readdirSync(frontendPath));
  
  // Serve static files from the frontend directory
  app.use(express.static(frontendPath));
  
  // Serve other static assets if needed
  app.use('/assets', express.static(path.join(frontendPath, 'assets')));
} else {
  console.error('❌ Frontend files not found. Please check your project structure.');
}

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
  if (!frontendPath || !fs.existsSync(frontendPath)) {
    return res.status(500).json({
      error: 'Frontend configuration error',
      message: 'Server cannot locate frontend files'
    });
  }

  const indexPath = path.join(frontendPath, 'index.html');
  console.log(`Attempting to serve index.html from: ${indexPath}`);
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ ERROR: index.html not found at:', indexPath);
    return res.status(404).json({
      error: 'index.html not found',
      absolutePath: indexPath,
      currentDirContents: fs.readdirSync(path.dirname(indexPath))
    });
  }

  try {
    res.sendFile(indexPath);
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).json({
      error: 'Error loading application',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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
  if (frontendPath && fs.existsSync(frontendPath)) {
    console.log(`📁 Serving frontend from: ${frontendPath}`);
  } else {
    console.error('⚠️  Warning: Frontend path not properly configured');
  }
});