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

// Simplified frontend path resolution
const projectRoot = process.cwd();
const possibleFrontendPaths = [
  // Railway likely structure
  path.join(projectRoot, 'frontend', 'client', 'applicant', 'home'),
  // Alternative structures
  path.join(projectRoot, '..', 'frontend', 'client', 'applicant', 'home'),
  path.join(__dirname, '..', 'frontend', 'client', 'applicant', 'home'),
  path.join(__dirname, '..', '..', 'frontend', 'client', 'applicant', 'home')
];

let frontendPath = null;

// Find the first valid frontend path
for (const possiblePath of possibleFrontendPaths) {
  console.log(`Checking frontend path: ${possiblePath}`);
  if (fs.existsSync(possiblePath)) {
    frontendPath = possiblePath;
    console.log(`✅ Found frontend at: ${frontendPath}`);
    break;
  }
}

if (frontendPath) {
  console.log('Frontend directory contents:', fs.readdirSync(frontendPath));
  
  // Serve static files
  app.use(express.static(frontendPath));
  
  // Serve assets if needed
  app.use('/assets', express.static(path.join(frontendPath, 'assets')));
} else {
  console.error('❌ Frontend not found at any of these locations:');
  console.log(possibleFrontendPaths);
  console.log('Current directory contents:', fs.readdirSync(projectRoot));
}

// API routes - prefixed with /api
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

// Debug endpoint to check file structure
app.get('/debug-structure', (req, res) => {
  const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(file));
      } else {
        results.push(file);
      }
    });
    return results;
  };
  
  res.json({
    projectRoot,
    frontendPath,
    exists: frontendPath ? fs.existsSync(frontendPath) : false,
    files: walk(projectRoot)
  });
});

// Serve index.html for all non-API GET requests
app.get('*', (req, res) => {
  if (!frontendPath || !fs.existsSync(frontendPath)) {
    return res.status(500).json({
      error: 'Frontend configuration error',
      message: 'Server cannot locate frontend files',
      possiblePaths: possibleFrontendPaths,
      currentStructure: fs.readdirSync(projectRoot)
    });
  }

  const indexPath = path.join(frontendPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(404).json({
      error: 'index.html not found',
      path: indexPath,
      contents: fs.readdirSync(frontendPath)
    });
  }

  res.sendFile(indexPath);
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
    console.log('Main files available:', fs.readdirSync(frontendPath));
  } else {
    console.error('⚠️  Frontend path not properly configured');
    console.log('Visit /debug-structure endpoint to diagnose');
  }
});