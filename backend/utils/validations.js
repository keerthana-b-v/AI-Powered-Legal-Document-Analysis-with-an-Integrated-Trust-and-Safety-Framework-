const validateFileType = (mimeType) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", // .doc files
    "text/plain",
    "image/jpeg",
    "image/png",
  ]

  if (!allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: "Only PDF, DOC, DOCX, TXT, JPG, and PNG files are allowed",
    }
  }

  return { isValid: true }
}

const validateFileSize = (size) => {
  const maxSize = 50 * 1024 * 1024 // 50MB (increased from 10MB)

  if (size > maxSize) {
    return {
      isValid: false,
      error: "File size must be less than 50MB",
    }
  }

  return { isValid: true }
}

const validateBatchSize = (totalSize) => {
  const maxBatchSize = 200 * 1024 * 1024 // 200MB total batch size (increased from 50MB)

  if (totalSize > maxBatchSize) {
    return {
      isValid: false,
      error: "Total batch size must be less than 200MB",
    }
  }

  return { isValid: true }
}

const validateDocumentId = (id) => {
  const mongoose = require("mongoose")

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      isValid: false,
      error: "Invalid document ID format",
    }
  }

  return { isValid: true }
}

const validateBatchName = (name) => {
  if (!name) {
    return { isValid: true } // Optional field
  }

  if (typeof name !== "string") {
    return {
      isValid: false,
      error: "Batch name must be a string",
    }
  }

  if (name.length > 255) {
    return {
      isValid: false,
      error: "Batch name must be less than 255 characters",
    }
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    return {
      isValid: false,
      error: "Batch name contains invalid characters",
    }
  }

  return { isValid: true }
}

module.exports = {
  validateFileType,
  validateFileSize,
  validateBatchSize,
  validateDocumentId,
  validateBatchName,
}
