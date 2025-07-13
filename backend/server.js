/**
 * server.js – BACKEND_ETEEAP
 * ------------------------------------------------------------
 *  ▸ Exposes only the API (no static files or index.html).
 *  ▸ Enables CORS for your deployed frontend and localhost dev.
 *  ▸ Keeps all existing routes (applicants, assessors, admins…).
 *  ▸ Includes health‑check and global error handling.
 */

require("dotenv").config();

const express       = require("express");
const mongoose      = require("mongoose");
const bodyParser    = require("body-parser");
const cookieParser  = require("cookie-parser");
const cors          = require("cors");
const path          = require("path");           // still handy for file uploads, etc.

const connectDB     = require("./config/db");
const { PORT }      = require("./config/constants");

const routes        = require("./routes");
const applicants    = require("./routes/applicantRoutes");
const admins        = require("./routes/adminRoutes");
const assessors     = require("./routes/assessorRoutes");

// ──────────────────────────────────────────────────────────────
// 1. App & Database
// ──────────────────────────────────────────────────────────────
const app = express();
connectDB();   // connects to MongoDB

// ──────────────────────────────────────────────────────────────
// 2. Core middleware
// ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// ──────────────────────────────────────────────────────────────
// 3. CORS  (only allow your deployed frontend + localhost dev)
// ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://frontendeteeap-production.up.railway.app", // deployed SPA
  "http://localhost:3000"                             // local dev (vite / CRA / etc.)
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "Authorization"]
  })
);

// handle pre‑flight for every route
app.options("*", cors());

// ──────────────────────────────────────────────────────────────
// 4. API routes
// ──────────────────────────────────────────────────────────────
app.use("/", routes, applicants, assessors, admins);

// ──────────────────────────────────────────────────────────────
// 5. Health‑check endpoint
// ──────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ db: "connected" });
  } catch (err) {
    res.status(503).json({ db: "disconnected" });
  }
});

// ──────────────────────────────────────────────────────────────
// 6. 404 handler (no index.html – frontend runs elsewhere)
// ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.accepts("json")) {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  // for any non‑API path we simply inform that this service is API‑only
  res.status(404).send(
    "This is the ETEEAP API service. The frontend is hosted at " +
    "https://frontendeteeap-production.up.railway.app/"
  );
});

// ──────────────────────────────────────────────────────────────
// 7. Global error handler
// ──────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development" ? err.message : undefined,
    stack:
      process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ──────────────────────────────────────────────────────────────
// 8. Start server
// ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
