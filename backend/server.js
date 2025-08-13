// // const express = require("express")
// // const mongoose = require("mongoose")
// // const cors = require("cors")
// // const helmet = require("helmet")
// // const compression = require("compression")
// // const morgan = require("morgan")
// // const rateLimit = require("express-rate-limit")
// // const path = require("path")
// // const fs = require("fs")
// // require("dotenv").config()

// // // Import routes
// // const documentRoutes = require("./routes/documents")
// // const analysisRoutes = require("./routes/analysis")
// // const evaluationRoutes = require("./routes/evaluation")

// // // Import middleware
// // const errorHandler = require("./middleware/errorHandler")

// // const app = express()
// // const PORT = process.env.PORT || 5000

// // // Security middleware
// // app.use(
// //   helmet({
// //     crossOriginResourcePolicy: { policy: "cross-origin" },
// //   }),
// // )

// // // Compression middleware
// // app.use(compression())

// // // Logging middleware
// // if (process.env.NODE_ENV === "development") {
// //   app.use(morgan("dev"))
// // } else {
// //   app.use(morgan("combined"))
// // }

// // // CORS configuration
// // app.use(
// //   cors({
// //     origin: process.env.CLIENT_URL || "http://localhost:3000",
// //     credentials: true,
// //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
// //     allowedHeaders: ["Content-Type", "Authorization"],
// //   }),
// // )

// // // Rate limiting
// // const limiter = rateLimit({
// //   windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
// //   max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reduced from 100 due to larger files
// //   message: {
// //     error: "Too many requests from this IP, please try again later.",
// //   },
// //   standardHeaders: true,
// //   legacyHeaders: false,
// // })
// // app.use("/api/", limiter)

// // // Body parsing middleware
// // app.use(express.json({ limit: "50mb" })) // Increased from 10mb
// // app.use(express.urlencoded({ extended: true, limit: "50mb" })) // Increased from 10mb

// // // Static files
// // app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// // // Create uploads directory if it doesn't exist
// // const uploadsDir = path.join(__dirname, "uploads")
// // if (!fs.existsSync(uploadsDir)) {
// //   fs.mkdirSync(uploadsDir, { recursive: true })
// //   console.log("📁 Created uploads directory")
// // }

// // // Database connection
// // mongoose
// //   .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/legal-analyzer", {
// //     useNewUrlParser: true,
// //     useUnifiedTopology: true,
// //   })
// //   .then(() => {
// //     console.log("✅ MongoDB connected successfully")
// //   })
// //   .catch((err) => {
// //     console.error("❌ MongoDB connection error:", err)
// //     process.exit(1)
// //   })

// // // Health check endpoint
// // app.get("/api/health", (req, res) => {
// //   res.json({
// //     status: "OK",
// //     timestamp: new Date().toISOString(),
// //     uptime: process.uptime(),
// //     environment: process.env.NODE_ENV,
// //     version: "1.0.0",
// //   })
// // })

// // // API routes
// // app.use("/api/documents", documentRoutes)
// // app.use("/api/analysis", analysisRoutes)
// // app.use("/api/evaluation", evaluationRoutes)

// // // 404 handler for API routes
// // app.use("/api/*", (req, res) => {
// //   res.status(404).json({
// //     error: "API route not found",
// //     path: req.originalUrl,
// //   })
// // })

// // // Error handling middleware
// // app.use(errorHandler)

// // // Graceful shutdown
// // const gracefulShutdown = () => {
// //   console.log("🔄 Received shutdown signal, closing server gracefully...")
// //   mongoose.connection.close(() => {
// //     console.log("✅ MongoDB connection closed")
// //     process.exit(0)
// //   })
// // }

// // process.on("SIGTERM", gracefulShutdown)
// // process.on("SIGINT", gracefulShutdown)

// // // Start server
// // app.listen(PORT, () => {
// //   console.log(`🚀 Server running on port ${PORT}`)
// //   console.log(`📊 Environment: ${process.env.NODE_ENV}`)
// //   console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`)
// //   console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`)
// // })

// // module.exports = app

// const express = require("express")
// const mongoose = require("mongoose")
// const cors = require("cors")
// const helmet = require("helmet")
// const compression = require("compression")
// const morgan = require("morgan")
// const rateLimit = require("express-rate-limit")
// const path = require("path")
// const fs = require("fs")
// require("dotenv").config()

// // Import routes
// const documentRoutes = require("./routes/documents")
// const analysisRoutes = require("./routes/analysis")
// const evaluationRoutes = require("./routes/evaluation")
// const trustSafetyRoutes = require("./routes/trust_safety")

// // Import middleware
// const errorHandler = require("./middleware/errorHandler")

// const app = express()
// const PORT = process.env.PORT || 5000

// // Security middleware
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//   }),
// )

// // Compression middleware
// app.use(compression())

// // Logging middleware
// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"))
// } else {
//   app.use(morgan("combined"))
// }

// // CORS configuration
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "http://localhost:3000",
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// )

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reduced from 100 due to larger files
//   message: {
//     error: "Too many requests from this IP, please try again later.",
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// })
// app.use("/api/", limiter)

// // Body parsing middleware
// app.use(express.json({ limit: "50mb" })) // Increased from 10mb
// app.use(express.urlencoded({ extended: true, limit: "50mb" })) // Increased from 10mb

// // Static files
// app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
//   console.log("📁 Created uploads directory")
// }

// // Database connection
// mongoose
//   .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/legal-analyzer", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => {
//     console.log("✅ MongoDB connected successfully")
//   })
//   .catch((err) => {
//     console.error("❌ MongoDB connection error:", err)
//     process.exit(1)
//   })

// // Health check endpoint
// app.get("/api/health", (req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV,
//     version: "1.0.0",
//   })
// })

// // API routes
// app.use("/api/documents", documentRoutes)
// app.use("/api/analysis", analysisRoutes)
// app.use("/api/evaluation", evaluationRoutes)
// app.use("/api/trust-safety", trustSafetyRoutes)

// // 404 handler for API routes
// app.use("/api/*", (req, res) => {
//   res.status(404).json({
//     error: "API route not found",
//     path: req.originalUrl,
//   })
// })

// // Error handling middleware
// app.use(errorHandler)

// // Graceful shutdown
// const gracefulShutdown = () => {
//   console.log("🔄 Received shutdown signal, closing server gracefully...")
//   mongoose.connection.close(() => {
//     console.log("✅ MongoDB connection closed")
//     process.exit(0)
//   })
// }

// process.on("SIGTERM", gracefulShutdown)
// process.on("SIGINT", gracefulShutdown)

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`)
//   console.log(`📊 Environment: ${process.env.NODE_ENV}`)
//   console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`)
//   console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`)
//   console.log(`🛡️ Trust & Safety features enabled`)
//   console.log(`   - Dashboard: http://localhost:${PORT}/api/trust-safety/dashboard`)
//   console.log(`   - PII Redaction: POST /api/trust-safety/privacy/redact`)
//   console.log(`   - Fairness Audit: POST /api/trust-safety/fairness/audit`)
//   console.log(`   - Confidence Scoring: POST /api/trust-safety/confidence/score`)
//   console.log(`   - Human Feedback: POST /api/trust-safety/feedback`)
// })

// module.exports = app

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

// Import routes
const documentRoutes = require("./routes/documents")
const analysisRoutes = require("./routes/analysis")
const evaluationRoutes = require("./routes/evaluation")
const trustSafetyRoutes = require("./routes/trust_safety")

// Import middleware
const errorHandler = require("./middleware/errorHandler")

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(morgan("combined"))
}

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reduced from 100 due to larger files
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "50mb" })) // Increased from 10mb
app.use(express.urlencoded({ extended: true, limit: "50mb" })) // Increased from 10mb

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("📁 Created uploads directory")
}

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/legal-analyzer", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully")
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
    process.exit(1)
  })

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  })
})

// API routes
app.use("/api/documents", documentRoutes)
app.use("/api/analysis", analysisRoutes)
app.use("/api/evaluation", evaluationRoutes)
app.use("/api/trust-safety", trustSafetyRoutes) // Trust & Safety routes already added

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API route not found",
    path: req.originalUrl,
  })
})

// Error handling middleware
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("🔄 Received shutdown signal, closing server gracefully...")
  mongoose.connection.close(() => {
    console.log("✅ MongoDB connection closed")
    process.exit(0)
  })
}

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV}`)
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`)
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`)
  console.log(`🛡️ Trust & Safety features enabled`)
  console.log(`   - Dashboard: http://localhost:${PORT}/api/trust-safety/dashboard`)
  console.log(`   - PII Redaction: POST /api/trust-safety/privacy/redact`)
  console.log(`   - Fairness Audit: POST /api/trust-safety/fairness/audit`)
  console.log(`   - Confidence Scoring: POST /api/trust-safety/confidence/score`)
  console.log(`   - Human Feedback: POST /api/trust-safety/feedback`)
})

module.exports = app
