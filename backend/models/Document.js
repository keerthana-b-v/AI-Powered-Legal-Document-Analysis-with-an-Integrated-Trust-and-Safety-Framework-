const mongoose = require("mongoose")

const clauseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  type: {
    type: String,
    required: true,
    enum: [
      "termination",
      "payment",
      "liability",
      "confidentiality",
      "intellectual_property",
      "dispute_resolution",
      "force_majeure",
      "governing_law",
      "amendment",
      "assignment",
      "severability",
      "entire_agreement",
      "duration", // Added for rental agreements
      "internal_maintenance", // Added for rental agreements
      "additions_alterations", // Added for rental agreements
      "other",
    ],
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  text: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  startIndex: {
    type: Number,
    min: 0,
  },
  endIndex: {
    type: Number,
    min: 0,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  riskScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
  },
  riskLevel: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "MEDIUM",
  },
  riskFactors: [
    {
      type: String,
      maxlength: 200,
    },
  ],
  suggestions: [
    {
      type: String,
      maxlength: 500,
    },
  ],
  suggestion: {
    type: String,
    maxlength: 500,
  },
  justification: {
    type: String,
    maxlength: 500,
  },
  highlightedWords: [
    {
      word: String,
      startIndex: Number,
      endIndex: Number,
      reason: String,
    },
  ],
  sourceFile: {
    type: String,
    maxlength: 255,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
})

// Update the document schema to support larger batch uploads
const documentSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      maxlength: 255,
      default: () => `Batch ${new Date().toISOString().split("T")[0]}`,
    },
    filename: {
      type: String,
      required: true,
      maxlength: 2000, // Increased to accommodate more filenames
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 2000, // Increased to accommodate more original names
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
      max: 200 * 1024 * 1024, // 200MB for batch uploads (increased from 52MB)
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "image/jpeg",
        "image/png",
        "batch/multiple", // New type for batch uploads
      ],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["uploaded", "extracting", "processing", "completed", "error"],
      default: "uploaded",
    },
    extractedText: {
      type: String,
      maxlength: 1000000, // Increased to 1MB for larger batch content
    },
    textExtractionTime: {
      type: Number, // in milliseconds
    },
    analysis: {
      overallRiskScore: {
        type: Number,
        min: 1,
        max: 10,
      },
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
      },
      clauses: [clauseSchema],
      missingClauses: [
        {
          type: String,
          enum: [
            "termination",
            "payment",
            "liability",
            "confidentiality",
            "intellectual_property",
            "dispute_resolution",
            "force_majeure",
            "governing_law",
            "duration", // Added for rental agreements
            "internal_maintenance", // Added for rental agreements
            "additions_alterations", // Added for rental agreements
          ],
        },
      ],
      recommendations: [
        {
          type: String,
          maxlength: 500,
        },
      ],
      summary: {
        type: String,
        maxlength: 1000,
      },
      processingTime: {
        type: Number, // in milliseconds
      },
      processedAt: {
        type: Date,
        default: Date.now,
      },
      version: {
        type: String,
        default: "2.0-enhanced", // Updated version
      },
    },
    errorMessage: {
      type: String,
      maxlength: 500,
    },
    metadata: {
      pageCount: Number,
      wordCount: Number,
      characterCount: Number,
      language: {
        type: String,
        default: "en",
      },
      fileCount: {
        type: Number,
        default: 1,
      },
      individualFiles: [
        {
          filename: String,
          originalName: String,
          size: Number,
          mimeType: String,
          extractedText: String,
          extractionTime: Number,
          extractionError: String,
        },
      ],
    },
    tags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
documentSchema.index({ status: 1 })
documentSchema.index({ uploadedAt: -1 })
documentSchema.index({ "analysis.riskLevel": 1 })
documentSchema.index({ mimeType: 1 })

// Virtual for file URL
documentSchema.virtual("fileUrl").get(function () {
  return `/uploads/${this.filename}`
})

// Method to calculate document statistics
documentSchema.methods.calculateStats = function () {
  if (this.extractedText) {
    this.metadata.characterCount = this.extractedText.length
    this.metadata.wordCount = this.extractedText.split(/\s+/).length
  }
}

// Pre-save middleware
documentSchema.pre("save", function (next) {
  if (this.isModified("extractedText")) {
    this.calculateStats()
  }
  next()
})

// Static method to find documents by risk level
documentSchema.statics.findByRiskLevel = function (riskLevel) {
  return this.find({ "analysis.riskLevel": riskLevel })
}

// Static method to get recent documents
documentSchema.statics.getRecent = function (limit = 10) {
  return this.find().sort({ uploadedAt: -1 }).limit(limit).select("-extractedText")
}

module.exports = mongoose.model("Document", documentSchema)
