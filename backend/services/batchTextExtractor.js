const fs = require("fs")
const path = require("path")
const pdf = require("pdf-parse")
const mammoth = require("mammoth")
const { filterDocumentNoise } = require("./documentNoiseFilter")
const Document = require("../models/Document")

// Import Tesseract for OCR
let Tesseract
try {
  Tesseract = require("tesseract.js")
} catch (error) {
  console.warn("⚠️ Tesseract.js not installed. OCR functionality will be limited.")
}

/**
 * Enhanced text cleaning function
 */
function cleanTextLocal(text) {
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
      .replace(/\b(\w)\1{3,}\b/g, "$1") // Remove repeated characters (like "aaaa" -> "a")
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

/**
 * Extract text from PDF files
 */
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const pdfData = await pdf(dataBuffer, {
      max: 0, // No page limit
      version: "v1.10.100",
    })

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF appears to be empty or contains only images")
    }

    return pdfData.text
  } catch (error) {
    if (error.message.includes("Invalid PDF")) {
      throw new Error("Invalid or corrupted PDF file")
    }
    if (error.message.includes("password")) {
      throw new Error("Password-protected PDFs are not supported")
    }
    throw new Error(`PDF extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from DOCX files
 */
async function extractFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath })

    if (result.messages && result.messages.length > 0) {
      console.warn("DOCX extraction warnings:", result.messages)
    }

    if (!result.value || result.value.trim().length === 0) {
      throw new Error("DOCX appears to be empty")
    }

    return result.value
  } catch (error) {
    if (error.message.includes("not a valid")) {
      throw new Error("Invalid or corrupted DOCX file")
    }
    throw new Error(`DOCX extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from TXT files
 */
async function extractFromTXT(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8")

    if (!text || text.trim().length === 0) {
      throw new Error("TXT file appears to be empty")
    }

    return text
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("TXT file not found")
    }
    throw new Error(`TXT extraction failed: ${error.message}`)
  }
}

/**
 * Extract text from images using OCR
 */
async function extractFromImage(filePath, originalName) {
  try {
    console.log(`📷 Starting OCR extraction for ${originalName}`)

    if (!Tesseract) {
      // Fallback message if Tesseract is not available
      console.warn(`⚠️ Tesseract.js not available for ${originalName}`)
      return `[OCR library not installed. Please install tesseract.js to extract text from images, or convert ${originalName} to PDF format for analysis.]`
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`)
    }

    // Perform OCR using Tesseract.js
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`📖 OCR Progress for ${originalName}: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    if (!text || text.trim().length === 0) {
      console.warn(`⚠️ No text found in image ${originalName}`)
      return `[No readable text found in image ${originalName}. The image may be too blurry, low resolution, or contain no text.]`
    }

    console.log(`✅ OCR completed for ${originalName}: ${text.length} characters extracted`)
    return text
  } catch (error) {
    console.error(`❌ OCR extraction failed for ${originalName}:`, error)

    // Return a more helpful error message
    if (error.message.includes("not found")) {
      return `[Image file ${originalName} not found or corrupted.]`
    } else if (error.message.includes("format")) {
      return `[Unsupported image format for ${originalName}. Please use JPG or PNG format.]`
    } else {
      return `[OCR extraction failed for ${originalName}: ${error.message}. Please ensure the image is clear and contains readable text.]`
    }
  }
}

/**
 * Extract text from multiple files and merge them
 */
async function extractTextFromMultipleFiles(files, documentId) {
  const startTime = Date.now()

  try {
    const document = await Document.findById(documentId)
    if (!document) {
      throw new Error("Document not found")
    }

    // Update status to extracting
    document.status = "extracting"
    await document.save()

    console.log(`🔄 Starting batch text extraction for ${files.length} files`)

    const extractionResults = []
    let mergedText = ""
    let totalExtractionTime = 0

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileStartTime = Date.now()

      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.originalname}`)

      try {
        let extractedText = ""

        // Extract text based on file type
        if (file.mimetype === "application/pdf") {
          extractedText = await extractFromPDF(file.path)
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          extractedText = await extractFromDOCX(file.path)
        } else if (file.mimetype === "application/msword") {
          extractedText = await extractFromDOCX(file.path)
        } else if (file.mimetype === "text/plain") {
          extractedText = await extractFromTXT(file.path)
        } else if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
          extractedText = await extractFromImage(file.path, file.originalname)
        } else {
          throw new Error(`Unsupported file type: ${file.mimetype}`)
        }

        // Apply document noise filtering IMMEDIATELY after extraction
        console.log(`📝 Raw extracted text length for ${file.originalname}: ${extractedText.length}`)
        extractedText = filterDocumentNoise(extractedText)
        console.log(`🧹 Cleaned text length after noise filtering: ${extractedText.length}`)

        // Clean and validate extracted text
        extractedText = cleanTextLocal(extractedText)

        if (!extractedText || extractedText.trim().length === 0) {
          console.warn(`⚠️ No text extracted from ${file.originalname}`)
          extractedText = `[No readable text content found in ${file.originalname}]`
        }

        const fileExtractionTime = Date.now() - fileStartTime
        totalExtractionTime += fileExtractionTime

        // Add file separator and merge text
        if (mergedText.length > 0) {
          mergedText += `\n\n--- Content from ${file.originalname} ---\n\n`
        } else {
          mergedText += `--- Content from ${file.originalname} ---\n\n`
        }
        mergedText += extractedText

        // Store individual file results
        extractionResults.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          extractedText: extractedText.substring(0, 10000), // Store first 10KB for reference
          extractionTime: fileExtractionTime,
        })

        console.log(
          `✅ Extracted ${extractedText.length} characters from ${file.originalname} in ${fileExtractionTime}ms`,
        )
      } catch (fileError) {
        console.error(`❌ Failed to extract text from ${file.originalname}:`, fileError)

        // Add error info but continue processing other files
        extractionResults.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          extractedText: "",
          extractionTime: Date.now() - fileStartTime,
          extractionError: fileError.message,
        })

        // Add placeholder text for failed extractions
        if (mergedText.length > 0) {
          mergedText += `\n\n--- Content from ${file.originalname} (extraction failed) ---\n\n`
        } else {
          mergedText += `--- Content from ${file.originalname} (extraction failed) ---\n\n`
        }
        mergedText += `[Text extraction failed: ${fileError.message}]`
      }
    }

    // Validate final merged text
    if (!mergedText || mergedText.trim().length === 0) {
      throw new Error("No text could be extracted from any of the uploaded files")
    }

    // Apply size limit to merged text
    if (mergedText.length > 500000) {
      // 500KB limit
      console.warn(`⚠️ Merged text truncated for document ${documentId} due to size limit`)
      mergedText = mergedText.substring(0, 500000) + "\n\n[Content truncated due to size limit]"
    }

    const totalTime = Date.now() - startTime

    // Update document with merged text and metadata
    document.extractedText = mergedText
    document.textExtractionTime = totalTime
    document.status = "uploaded" // Ready for analysis
    document.metadata.individualFiles = extractionResults

    // Calculate stats for merged content
    document.calculateStats()

    await document.save()

    console.log(`✅ Batch text extraction completed for ${files.length} files in ${totalTime}ms`)
    console.log(`📊 Total merged text length: ${mergedText.length} characters`)

    return mergedText
  } catch (error) {
    console.error("❌ Batch text extraction error:", error)

    // Update document status to error
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: "error",
        errorMessage: `Batch text extraction failed: ${error.message}`,
      })
    } catch (updateError) {
      console.error("❌ Error updating document status:", updateError)
    }

    throw error
  }
}

module.exports = {
  extractTextFromMultipleFiles,
  extractFromPDF,
  extractFromDOCX,
  extractFromTXT,
  extractFromImage,
}
