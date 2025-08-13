const errorHandler = (error, req, res, next) => {
  console.error("Error:", error)

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message)
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
      code: "VALIDATION_ERROR",
    })
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
      code: "INVALID_ID",
    })
  }

  // Duplicate key error
  if (error.code === 11000) {
    return res.status(400).json({
      error: "Duplicate entry",
      code: "DUPLICATE_ERROR",
    })
  }

  // Multer errors
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large. Maximum size is 10MB",
      code: "FILE_TOO_LARGE",
    })
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Unexpected file field",
      code: "UNEXPECTED_FILE",
    })
  }

  // OpenAI API errors
  if (error.message && error.message.includes("OpenAI")) {
    return res.status(503).json({
      error: "AI service temporarily unavailable",
      code: "AI_SERVICE_ERROR",
    })
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    code: error.code || "INTERNAL_ERROR",
  })
}

module.exports = errorHandler
