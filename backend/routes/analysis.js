const express = require("express")
const { body, validationResult } = require("express-validator")
const Document = require("../models/Document")
const { analyzeDocument } = require("../services/documentAnalyzer")

const router = express.Router()

// Analyze document
router.post("/:id/analyze", async (req, res) => {
  try {
    console.log(`📊 Starting analysis for document ${req.params.id}`)

    const document = await Document.findById(req.params.id)

    if (!document) {
      console.log(`❌ Document ${req.params.id} not found`)
      return res.status(404).json({
        error: "Document not found",
        code: "NOT_FOUND",
      })
    }

    console.log(`📄 Document found: ${document.originalName}`)
    console.log(`📝 Status: ${document.status}`)
    console.log(`📏 Text length: ${document.extractedText ? document.extractedText.length : 0}`)

    if (!document.extractedText) {
      console.log(`❌ No extracted text for document ${req.params.id}`)
      return res.status(400).json({
        error: "Document text not yet extracted. Please wait for text extraction to complete.",
        code: "TEXT_NOT_EXTRACTED",
      })
    }

    if (document.status === "processing") {
      console.log(`⏳ Document ${req.params.id} already processing`)
      return res.status(400).json({
        error: "Document is already being processed",
        code: "ALREADY_PROCESSING",
      })
    }

    // Update status to processing
    document.status = "processing"
    await document.save()
    console.log(`🔄 Updated document status to processing`)

    const startTime = Date.now()

    try {
      console.log(`🤖 Starting enhanced AI analysis...`)

      // Use the enhanced document analyzer with proper error handling
      const { analyzeDocument } = require("../services/documentAnalyzer")
      const analysis = await analyzeDocument(document.extractedText, {
        sourceFile: document.originalName,
        documentId: document._id,
      })

      const processingTime = Date.now() - startTime

      console.log(`✅ Enhanced analysis completed in ${processingTime}ms`)

      // Add processing time to analysis
      analysis.processingTime = processingTime

      // Update document with analysis results
      document.analysis = analysis
      document.status = "completed"
      await document.save()

      console.log(`💾 Analysis results saved to database`)

      res.json({
        message: "Analysis completed successfully",
        analysis: analysis,
        processingTime: processingTime,
        documentId: document._id,
      })
    } catch (analysisError) {
      console.error("❌ Analysis error:", analysisError)

      // Update document status to error
      document.status = "error"
      document.errorMessage = analysisError.message
      await document.save()

      // Return more specific error information
      res.status(500).json({
        error: "Analysis failed: " + analysisError.message,
        code: "ANALYSIS_ERROR",
        details: process.env.NODE_ENV === "development" ? analysisError.stack : undefined,
      })
    }
  } catch (error) {
    console.error("❌ Analysis route error:", error)

    // Ensure document status is updated to error if not already done
    try {
      await Document.findByIdAndUpdate(req.params.id, {
        status: "error",
        errorMessage: error.message,
      })
    } catch (updateError) {
      console.error("❌ Error updating document status:", updateError)
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid document ID",
        code: "INVALID_ID",
      })
    }

    res.status(500).json({
      error: "Analysis failed: " + error.message,
      code: "ANALYSIS_ERROR",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

// Get analysis results
router.get("/:id/results", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "NOT_FOUND",
      })
    }

    if (!document.analysis) {
      return res.status(404).json({
        error: "No analysis results found. Please run analysis first.",
        code: "NO_ANALYSIS",
      })
    }

    res.json({
      analysis: document.analysis,
      documentInfo: {
        id: document._id,
        originalName: document.originalName,
        uploadedAt: document.uploadedAt,
        status: document.status,
      },
    })
  } catch (error) {
    console.error("Error fetching analysis results:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid document ID",
        code: "INVALID_ID",
      })
    }

    res.status(500).json({
      error: "Failed to fetch analysis results",
      code: "FETCH_ERROR",
    })
  }
})

// Export analysis results
router.get("/:id/export", async (req, res) => {
  try {
    const format = req.query.format || "json"
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "NOT_FOUND",
      })
    }

    if (!document.analysis) {
      return res.status(404).json({
        error: "No analysis results found",
        code: "NO_ANALYSIS",
      })
    }

    const exportData = {
      document: {
        id: document._id,
        originalName: document.originalName,
        uploadedAt: document.uploadedAt,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
      analysis: document.analysis,
      exportedAt: new Date().toISOString(),
    }

    if (format === "json") {
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Content-Disposition", `attachment; filename="analysis-${document._id}.json"`)
      res.json(exportData)
    } else {
      res.status(400).json({
        error: "Unsupported export format. Supported formats: json",
        code: "UNSUPPORTED_FORMAT",
      })
    }
  } catch (error) {
    console.error("Error exporting analysis:", error)
    res.status(500).json({
      error: "Failed to export analysis",
      code: "EXPORT_ERROR",
    })
  }
})

module.exports = router
