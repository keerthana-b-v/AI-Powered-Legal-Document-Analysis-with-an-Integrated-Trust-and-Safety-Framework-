/**
 * Document Noise Filtering Service
 * Removes non-contractual content like e-Stamp text, government headers, etc.
 */

const fs = require("fs")
const path = require("path")

class DocumentNoiseFilter {
  constructor() {
    // Patterns for noise detection and removal
    this.noisePatterns = {
      // e-Stamp related patterns
      eStamp: [
        /e-?stamp/gi,
        /INDIA NON JUDICIAL/gi,
        /NON JUDICIAL STAMP PAPER/gi,
        /STAMP PAPER/gi,
        /GOVERNMENT OF [A-Z\s]+/gi,
        /STATE OF [A-Z\s]+/gi,
        /KARNATAKA|MAHARASHTRA|DELHI|MUMBAI|BANGALORE/gi,
      ],

      // Government and administrative patterns
      government: [
        /GOVERNMENT OF/gi,
        /MINISTRY OF/gi,
        /DEPARTMENT OF/gi,
        /REGISTRAR/gi,
        /SUB REGISTRAR/gi,
        /REGISTRATION/gi,
      ],

      // Document metadata patterns
      metadata: [
        /AADHAR NO\.?\s*:?\s*\d+/gi,
        /PAN NO\.?\s*:?\s*[A-Z0-9]+/gi,
        /DOCUMENT NO\.?\s*:?\s*[A-Z0-9]+/gi,
        /SERIAL NO\.?\s*:?\s*[A-Z0-9]+/gi,
        /CERTIFICATE NO\.?\s*:?\s*[A-Z0-9]+/gi,
      ],

      // Page numbers and formatting
      pageNumbers: [
        /PAGE\s+\d+\s+OF\s+\d+/gi,
        /PAGE\s+\d+/gi,
        /^\s*\d+\s*$/gm, // Standalone numbers on lines
        /\[\s*\d+\s*\]/g, // Numbers in brackets
      ],

      // Legal boilerplate that's not clause content
      boilerplate: [
        /WITNESSED BY/gi,
        /IN WITNESS WHEREOF/gi,
        /SIGNED AND DELIVERED/gi,
        /NOTARIZED BY/gi,
        /SWORN BEFORE ME/gi,
        /SUBSCRIBED AND SWORN/gi,
      ],

      // OCR artifacts and formatting noise
      ocrArtifacts: [
        /\|{2,}/g, // Multiple pipe characters
        /_{3,}/g, // Multiple underscores
        /-{5,}/g, // Multiple dashes (more than 4)
        /\.{4,}/g, // Multiple dots (more than 3)
        /\s{3,}/g, // Multiple spaces (replace with single space)
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Control characters
      ],

      // Watermarks and stamps
      watermarks: [/WATERMARK/gi, /CONFIDENTIAL/gi, /DRAFT/gi, /COPY/gi, /DUPLICATE/gi, /ORIGINAL/gi, /SPECIMEN/gi],
    }

    // Keywords that indicate contractual content (preserve these sections)
    this.contractualKeywords = [
      "agreement",
      "contract",
      "lease",
      "rental",
      "tenant",
      "landlord",
      "lessor",
      "lessee",
      "party",
      "parties",
      "terms",
      "conditions",
      "obligations",
      "rights",
      "responsibilities",
      "payment",
      "rent",
      "deposit",
      "duration",
      "termination",
      "maintenance",
      "repairs",
      "liability",
      "damages",
      "breach",
      "default",
      "notice",
      "consent",
      "approval",
      "assignment",
      "subletting",
      "alterations",
      "modifications",
      "insurance",
      "utilities",
      "possession",
      "delivery",
      "surrender",
      "renewal",
      "extension",
    ]
  }

  /**
   * Main function to filter document noise
   */
  filterDocumentNoise(text) {
    if (!text || typeof text !== "string") {
      return ""
    }

    console.log(`🧹 Starting document noise filtering for text of length: ${text.length}`)

    let cleanedText = text

    // Step 1: Remove e-Stamp and government headers
    cleanedText = this.removeEStampNoise(cleanedText)

    // Step 2: Remove metadata and administrative content
    cleanedText = this.removeMetadataNoise(cleanedText)

    // Step 3: Remove page numbers and formatting artifacts
    cleanedText = this.removeFormattingNoise(cleanedText)

    // Step 4: Remove OCR artifacts
    cleanedText = this.removeOCRArtifacts(cleanedText)

    // Step 5: Remove boilerplate legal text that's not clause content
    cleanedText = this.removeBoilerplateNoise(cleanedText)

    // Step 6: Clean up whitespace and normalize text
    cleanedText = this.normalizeWhitespace(cleanedText)

    // Step 7: Validate that we still have contractual content
    cleanedText = this.validateContractualContent(cleanedText, text)

    console.log(`✅ Document noise filtering completed. Cleaned text length: ${cleanedText.length}`)

    return cleanedText
  }

  /**
   * Remove e-Stamp related noise
   */
  removeEStampNoise(text) {
    let cleaned = text

    // Remove e-Stamp patterns
    this.noisePatterns.eStamp.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    // Remove specific e-Stamp phrases
    const eStampPhrases = [
      "INDIA NON JUDICIAL",
      "NON JUDICIAL STAMP PAPER",
      "GOVERNMENT OF KARNATAKA",
      "GOVERNMENT OF MAHARASHTRA",
      "GOVERNMENT OF DELHI",
      "STATE GOVERNMENT",
      "STAMP DUTY",
      "REVENUE STAMP",
    ]

    eStampPhrases.forEach((phrase) => {
      const regex = new RegExp(phrase.replace(/\s+/g, "\\s+"), "gi")
      cleaned = cleaned.replace(regex, " ")
    })

    return cleaned
  }

  /**
   * Remove metadata and administrative content
   */
  removeMetadataNoise(text) {
    let cleaned = text

    // Remove metadata patterns
    this.noisePatterns.metadata.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    // Remove government patterns
    this.noisePatterns.government.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    return cleaned
  }

  /**
   * Remove formatting and page number noise
   */
  removeFormattingNoise(text) {
    let cleaned = text

    // Remove page number patterns
    this.noisePatterns.pageNumbers.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    return cleaned
  }

  /**
   * Remove OCR artifacts
   */
  removeOCRArtifacts(text) {
    let cleaned = text

    // Remove OCR artifact patterns
    this.noisePatterns.ocrArtifacts.forEach((pattern) => {
      if (pattern.source.includes("{3,}")) {
        // For multiple character patterns, replace with single space
        cleaned = cleaned.replace(pattern, " ")
      } else {
        cleaned = cleaned.replace(pattern, "")
      }
    })

    return cleaned
  }

  /**
   * Remove boilerplate legal text
   */
  removeBoilerplateNoise(text) {
    let cleaned = text

    // Remove boilerplate patterns
    this.noisePatterns.boilerplate.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    // Remove watermark patterns
    this.noisePatterns.watermarks.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    return cleaned
  }

  /**
   * Normalize whitespace and clean up text
   */
  normalizeWhitespace(text) {
    return (
      text
        // Replace multiple spaces with single space
        .replace(/\s+/g, " ")
        // Replace multiple newlines with double newline
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        // Remove leading/trailing whitespace from lines
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        // Remove empty lines at start and end
        .trim()
    )
  }

  /**
   * Validate that we still have contractual content
   */
  validateContractualContent(cleanedText, originalText) {
    // Check if cleaned text has sufficient contractual keywords
    const lowerCleaned = cleanedText.toLowerCase()
    const contractualKeywordCount = this.contractualKeywords.filter((keyword) => lowerCleaned.includes(keyword)).length

    // If we removed too much content, try a more conservative approach
    if (cleanedText.length < originalText.length * 0.3 || contractualKeywordCount < 3) {
      console.warn("⚠️ Aggressive filtering may have removed too much content. Using conservative filtering.")
      return this.conservativeFilter(originalText)
    }

    // Ensure minimum content length
    if (cleanedText.length < 100) {
      console.warn("⚠️ Cleaned text too short. Using conservative filtering.")
      return this.conservativeFilter(originalText)
    }

    return cleanedText
  }

  /**
   * Conservative filtering approach when aggressive filtering removes too much
   */
  conservativeFilter(text) {
    let cleaned = text

    // Only remove the most obvious noise patterns
    const conservativePatterns = [
      /e-?stamp/gi,
      /INDIA NON JUDICIAL/gi,
      /GOVERNMENT OF [A-Z\s]+/gi,
      /AADHAR NO\.?\s*:?\s*\d+/gi,
      /PAGE\s+\d+\s+OF\s+\d+/gi,
      /\|{3,}/g,
      /_{4,}/g,
      /-{6,}/g,
    ]

    conservativePatterns.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, " ")
    })

    return this.normalizeWhitespace(cleaned)
  }

  /**
   * Analyze noise content for debugging
   */
  analyzeNoise(text) {
    const analysis = {
      originalLength: text.length,
      noiseFound: {},
      totalNoiseCharacters: 0,
    }

    Object.entries(this.noisePatterns).forEach(([category, patterns]) => {
      analysis.noiseFound[category] = []

      patterns.forEach((pattern) => {
        const matches = text.match(pattern)
        if (matches) {
          analysis.noiseFound[category].push({
            pattern: pattern.source,
            matches: matches.length,
            examples: matches.slice(0, 3), // First 3 examples
          })
          analysis.totalNoiseCharacters += matches.join("").length
        }
      })
    })

    analysis.noisePercentage = ((analysis.totalNoiseCharacters / analysis.originalLength) * 100).toFixed(2)

    return analysis
  }

  /**
   * Extract sections that are likely contractual content
   */
  extractContractualSections(text) {
    const sections = []
    const lines = text.split("\n")

    let currentSection = []
    let inContractualContent = false

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      const hasContractualKeywords = this.contractualKeywords.some((keyword) => lowerLine.includes(keyword))

      // Check if line contains noise
      const hasNoise = Object.values(this.noisePatterns)
        .flat()
        .some((pattern) => pattern.test(line))

      if (hasContractualKeywords && !hasNoise) {
        inContractualContent = true
        currentSection.push(line)
      } else if (inContractualContent && !hasNoise && line.trim().length > 0) {
        currentSection.push(line)
      } else if (inContractualContent && currentSection.length > 0) {
        // End of contractual section
        sections.push(currentSection.join("\n"))
        currentSection = []
        inContractualContent = false
      }
    }

    // Add final section if exists
    if (currentSection.length > 0) {
      sections.push(currentSection.join("\n"))
    }

    return sections
  }
}

// Create singleton instance
const documentNoiseFilter = new DocumentNoiseFilter()

/**
 * Main export function for filtering document noise
 */
function filterDocumentNoise(text) {
  try {
    return documentNoiseFilter.filterDocumentNoise(text)
  } catch (error) {
    console.error("❌ Error in document noise filtering:", error)
    // Return original text if filtering fails
    return text
  }
}

/**
 * Analyze noise in document for debugging
 */
function analyzeDocumentNoise(text) {
  try {
    return documentNoiseFilter.analyzeNoise(text)
  } catch (error) {
    console.error("❌ Error in noise analysis:", error)
    return { error: error.message }
  }
}

module.exports = {
  filterDocumentNoise,
  analyzeDocumentNoise,
  DocumentNoiseFilter,
}
