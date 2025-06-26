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
    // 1. Get token from cookies (frontend) or Authorization header (Postman/testing)
    const token = req.cookies.adminToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Authorization token required" 
      });
    }

    // 2. Verify token without additional DB check (for now)
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Attach minimal admin info to request
    req.admin = { 
      id: decoded.id, 
      email: decoded.email 
    };
    
    next();

  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    
    // Specific error messages
    const errorResponse = {
      success: false,
      error: err.name === 'TokenExpiredError' 
        ? "Session expired. Please login again."
        : "Invalid authentication token"
    };
    
    res.status(401).json(errorResponse);
  }
};


module.exports = {
  applicantAuthMiddleware,
  assessorAuthMiddleware,
  adminAuthMiddleware,
};
