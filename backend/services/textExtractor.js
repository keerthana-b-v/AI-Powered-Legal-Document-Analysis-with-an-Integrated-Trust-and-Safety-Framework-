const fs = require("fs")
const pdf = require("pdf-parse")
const mammoth = require("mammoth")
const Document = require("../models/Document")
const { filterDocumentNoise } = require("./documentNoiseFilter")

// Add the new batch extraction function import
const {
  extractTextFromMultipleFiles,
  extractFromPDF,
  extractFromDOCX,
  extractFromTXT,
  extractFromImage,
} = require("./batchTextExtractor")

// Add import at the top
const { filterAdvancedLayoutNoise } = require("./layoutAwareFilter")

async function extractTextFromFile(filePath, documentId) {
  const startTime = Date.now()

  try {
    const document = await Document.findById(documentId)
    if (!document) {
      throw new Error("Document not found")
    }

    // Update status to extracting
    document.status = "extracting"
    await document.save()

    let extractedText = ""

    if (document.mimeType === "application/pdf") {
      extractedText = await extractFromPDF(filePath)
    } else if (document.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      extractedText = await extractFromDOCX(filePath)
    } else if (document.mimeType === "application/msword") {
      extractedText = await extractFromDOCX(filePath)
    } else if (document.mimeType === "text/plain") {
      extractedText = await extractFromTXT(filePath)
    } else if (document.mimeType === "image/jpeg" || document.mimeType === "image/png") {
      extractedText = await extractFromImage(filePath, document.originalName)
    } else {
      throw new Error("Unsupported file type")
    }

    // Apply advanced layout-aware filtering IMMEDIATELY after extraction
    console.log(`📝 Raw extracted text length: ${extractedText.length}`)
    extractedText = filterAdvancedLayoutNoise(extractedText)
    console.log(`🎯 Advanced layout-aware filtered text length: ${extractedText.length}`)

    // Clean and normalize text
    extractedText = cleanText(extractedText)

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the document")
    }

    if (extractedText.length > 100000) {
      // 100KB limit
      extractedText = extractedText.substring(0, 100000)
      console.warn(`Text truncated for document ${documentId} due to size limit`)
    }

    const extractionTime = Date.now() - startTime

    // Update document with extracted text and metadata
    document.extractedText = extractedText
    document.textExtractionTime = extractionTime
    document.status = "uploaded" // Ready for analysis

    // Calculate metadata
    document.calculateStats()

    await document.save()

    console.log(`✅ Text extraction completed for ${document.originalName} in ${extractionTime}ms`)
    return extractedText
  } catch (error) {
    console.error("Text extraction error:", error)

    // Update document status to error
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: "error",
        errorMessage: `Text extraction failed: ${error.message}`,
      })
    } catch (updateError) {
      console.error("Error updating document status:", updateError)
    }

    throw error
  }
}

function cleanText(text) {
  if (!text) return ""

  return (
    text
      // Remove special characters and symbols but keep basic punctuation
      .replace(/[^\w\s.,;:!?()-]/g, " ")
      // Normalize whitespace (multiple spaces to single space)
      .replace(/\s+/g, " ")
      // Normalize line breaks (multiple line breaks to double line break)
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      // Remove excessive punctuation (more than 3 consecutive dots)
      .replace(/\.{4,}/g, "...")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Fix common OCR errors
      .replace(/\b(\w)\1{3,}\b/g, "$1") // Remove repeated characters
      // Clean up common OCR artifacts
      .replace(/[|]{2,}/g, " ") // Multiple pipes to space
      .replace(/[-]{3,}/g, "---") // Multiple dashes to triple dash
      .replace(/[_]{3,}/g, " ") // Multiple underscores to space
      // Trim whitespace from each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Final trim
      .trim()
  )
}

// Export all functions including the new ones
module.exports = {
  extractTextFromFile,
  extractFromPDF,
  extractFromDOCX,
  cleanText,
  extractTextFromMultipleFiles, // Add this export
  extractFromTXT, // Add this export
  extractFromImage, // Add this export
}
