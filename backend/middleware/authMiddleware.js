const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");
const Applicant = require("../models/Applicant");
const Assessor = require("../models/Assessor");
const Admin = require("../models/Admin");

const applicantAuthMiddleware = async (req, res, next) => {
  const token = req.cookies.applicantToken;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.applicant = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const assessorAuthMiddleware = async (req, res, next) => {
  const token = req.cookies.assessorToken;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.assessor = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminAuthMiddleware = async (req, res, next) => {
  try {
    // 1. Get token from cookies or Authorization header
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false,
        error: "Not authenticated - No token provided" 
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Check if admin still exists (optional but recommended)
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      console.log('Admin not found in database');
      return res.status(401).json({ 
        success: false,
        error: "Admin account not found" 
      });
    }

    // 4. Attach admin to request
    req.admin = decoded;
    console.log(`Admin authenticated: ${decoded.email}`); // Debug log
    next();

  } catch (err) {
    console.error('Authentication error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: "Invalid token" 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: "Token expired" 
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Authentication failed" 
    });
  }
};


module.exports = {
  applicantAuthMiddleware,
  assessorAuthMiddleware,
  adminAuthMiddleware,
};
