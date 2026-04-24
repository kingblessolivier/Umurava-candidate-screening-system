import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Security Middleware
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/$/, "")] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ============================================
// Rate Limiting
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: "AI endpoint rate limit exceeded. Try again in a minute.",
  },
});

app.use(limiter);
app.use("/api/screening/run", aiLimiter);
app.use("/api/jobs/enhance", aiLimiter);
app.use("/api/candidates/upload/pdf", aiLimiter);

// ============================================
// Body Parsing
// ============================================
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ============================================
// Health Check
// ============================================
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "TalentAI API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// API Routes
// ============================================
app.use("/api", routes);

// ============================================
// Error Handling
// ============================================
// Handle undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================
const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI", "GEMINI_API_KEY"];
    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
      process.exit(1);
    }

    // Connect to database
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 TalentAI API running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  // Don't exit for memory errors thrown by background PDF/AI workers —
  // pdfjs-dist raises RangeError via internal EventEmitters that bypass try/catch.
  if (err instanceof RangeError && err.message.includes("Array buffer allocation failed")) {
    console.warn("[background-job] Array buffer allocation failed — skipping server exit");
    return;
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  if (err instanceof RangeError && err.message.includes("Array buffer allocation failed")) {
    console.warn("[background-job] Array buffer allocation failed — skipping server exit");
    return;
  }
  process.exit(1);
});
