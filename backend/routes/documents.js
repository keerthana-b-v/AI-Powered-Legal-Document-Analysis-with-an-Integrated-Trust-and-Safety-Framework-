const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")
const { body, validationResult } = require("express-validator")

const Document = require("../models/Document")
const { extractTextFromFile, extractTextFromMultipleFiles } = require("../services/textExtractor")
const { validateFileType, validateFileSize } = require("../utils/validations")

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}-${file.originalname}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", // .doc files
    "text/plain", // .txt files
    "image/jpeg", // .jpg files
    "image/png", // .png files
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Only PDF, DOC, DOCX, TXT, JPG, and PNG files are allowed"), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file (increased from 10MB)
    files: 50, // Maximum 50 files per batch (increased from 5)
  },
})

// Update the upload route to handle unlimited files
router.post("/upload", upload.array("document", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
        code: "NO_FILES",
      })
    }

    // Get batch name from request body
    const batchName = req.body.batchName || `Batch ${new Date().toISOString().split("T")[0]}`

    // Validate all files
    const validationErrors = []
    const validFiles = []

    for (const file of req.files) {
      const fileValidation = validateFileType(file.mimetype)
      if (!fileValidation.isValid) {
        validationErrors.push(`${file.originalname}: ${fileValidation.error}`)
        // Delete invalid file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
        continue
      }

      const sizeValidation = validateFileSize(file.size)
      if (!sizeValidation.isValid) {
        validationErrors.push(`${file.originalname}: ${sizeValidation.error}`)
        // Delete invalid file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return res.status(400).json({
        error: "No valid files to process",
        details: validationErrors,
        code: "NO_VALID_FILES",
      })
    }

    // Calculate total batch size
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0)
    const maxBatchSize = 200 * 1024 * 1024 // 200MB total batch size (increased from 50MB)

    if (totalSize > maxBatchSize) {
      // Clean up all files
      validFiles.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
      })
      return res.status(400).json({
        error: "Total batch size must be less than 200MB",
        code: "BATCH_TOO_LARGE",
      })
    }

    // Create a single document record for the batch
    const document = new Document({
      batchName: batchName,
      filename: validFiles.map((f) => f.filename).join(", "), // Store all filenames
      originalName: validFiles.map((f) => f.originalname).join(", "), // Store all original names
      fileSize: totalSize,
      mimeType: "batch/multiple", // Special mime type for batches
      status: "uploaded",
      metadata: {
        fileCount: validFiles.length,
        individualFiles: validFiles.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        })),
      },
    })

    await document.save()

    // Start text extraction for all files in background
    setImmediate(() => {
      extractTextFromMultipleFiles(validFiles, document._id)
        .then(() => {
          console.log(`✅ Batch text extraction completed for document ${document._id}`)
        })
        .catch((error) => {
          console.error(`❌ Batch text extraction failed for document ${document._id}:`, error)
        })
    })

    res.status(201).json({
      message: `${validFiles.length} file(s) uploaded successfully`,
      documentId: document._id,
      filename: document.originalName,
      batchName: document.batchName,
      status: document.status,
      uploadedAt: document.uploadedAt,
      fileCount: validFiles.length,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    })
  } catch (error) {
    console.error("Upload error:", error)

    // Clean up files if they exist
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
      })
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "One or more files too large. Maximum size is 50MB per file",
        code: "FILE_TOO_LARGE",
      })
    }

    res.status(500).json({
      error: "Upload failed",
      code: "UPLOAD_ERROR",
    })
  }
})

// Get all documents with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const status = req.query.status
    const riskLevel = req.query.riskLevel
    const sortBy = req.query.sortBy || "uploadedAt"
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1

    // Build filter object
    const filter = {}
    if (status) filter.status = status
    if (riskLevel) filter["analysis.riskLevel"] = riskLevel

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder

    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .select("-extractedText") // Exclude large text field
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Document.countDocuments(filter),
    ])

    res.json({
      documents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDocuments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching documents:", error)
    res.status(500).json({
      error: "Failed to fetch documents",
      code: "FETCH_ERROR",
    })
  }
})

// Get specific document
router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "NOT_FOUND",
      })
    }

    res.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid document ID",
        code: "INVALID_ID",
      })
    }

    res.status(500).json({
      error: "Failed to fetch document",
      code: "FETCH_ERROR",
    })
  }
})

// Delete document
router.delete("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "NOT_FOUND",
      })
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "../uploads", document.filename)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (fileError) {
        console.error("Error deleting file:", fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    await Document.findByIdAndDelete(req.params.id)

    res.json({
      message: "Document deleted successfully",
      documentId: req.params.id,
    })
  } catch (error) {
    console.error("Error deleting document:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid document ID",
        code: "INVALID_ID",
      })
    }

    res.status(500).json({
      error: "Failed to delete document",
      code: "DELETE_ERROR",
    })
  }
})

// Get document statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const [totalDocuments, completedAnalyses, highRiskDocuments, recentDocuments] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ status: "completed" }),
      Document.countDocuments({ "analysis.riskLevel": "high" }),
      Document.find().sort({ uploadedAt: -1 }).limit(5).select("originalName uploadedAt status analysis.riskLevel"),
    ])

    const statusDistribution = await Document.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const riskDistribution = await Document.aggregate([
      {
        $match: { "analysis.riskLevel": { $exists: true } },
      },
      {
        $group: {
          _id: "$analysis.riskLevel",
          count: { $sum: 1 },
        },
      },
    ])

    res.json({
      overview: {
        totalDocuments,
        completedAnalyses,
        highRiskDocuments,
        analysisRate: totalDocuments > 0 ? ((completedAnalyses / totalDocuments) * 100).toFixed(1) : 0,
      },
      distributions: {
        status: statusDistribution,
        risk: riskDistribution,
      },
      recentDocuments,
    })
  } catch (error) {
    console.error("Error fetching statistics:", error)
    res.status(500).json({
      error: "Failed to fetch statistics",
      code: "STATS_ERROR",
    })
  }
})

module.exports = router
