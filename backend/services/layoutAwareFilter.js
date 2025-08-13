/**
 * Advanced Layout-Aware Document Filtering Service (A-Grade)
 * Uses visual layout analysis to identify and exclude non-contractual regions
 */

const fs = require("fs")
const path = require("path")

class AdvancedLayoutAwareFilter {
  constructor() {
    // Advanced layout-based region detection patterns
    this.layoutRegions = {
      // Header region patterns (top 25% of first page)
      headerRegion: {
        position: "top",
        percentage: 25,
        indicators: [/INDIA NON JUDICIAL/i, /GOVERNMENT OF/i, /STATE OF/i, /STAMP PAPER/i, /e-?stamp/i, /REVENUE/i],
        characteristics: {
          hasTabularStructure: true,
          hasGraphicalElements: true,
          containsAdministrativeText: true,
        },
      },

      // Footer region patterns (bottom 5% of each page)
      footerRegion: {
        position: "bottom",
        percentage: 5,
        indicators: [/PAGE\s+\d+/i, /^\s*\d+\s*$/, /NOTARIZED/i, /WITNESSED/i, /SIGNATURE/i],
      },

      // Stamp/Seal regions (typically right side or corners)
      stampRegion: {
        position: "corner",
        indicators: [/SEAL/i, /STAMP/i, /NOTARY/i, /OFFICIAL/i, /CERTIFICATE/i],
        characteristics: {
          isolatedText: true,
          shortLines: true,
        },
      },

      // Administrative metadata regions
      metadataRegion: {
        indicators: [
          /AADHAR NO\.?\s*:?\s*\d+/i,
          /PAN NO\.?\s*:?\s*[A-Z0-9]+/i,
          /DOCUMENT NO\.?\s*:?\s*[A-Z0-9]+/i,
          /REGISTRATION NO\.?\s*:?\s*[A-Z0-9]+/i,
          /SERIAL NO\.?\s*:?\s*[A-Z0-9]+/i,
        ],
      },
    }

    // Contractual content indicators for body region identification
    this.contractualIndicators = [
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
      "whereas",
      "therefore",
      "terms",
      "conditions",
      "obligations",
      "rights",
      "payment",
      "termination",
      "duration",
      "maintenance",
      "alterations",
      "hereby",
      "witnesseth",
    ]

    // Advanced noise patterns with layout context
    this.advancedNoisePatterns = {
      // Tabular administrative content
      tabularNoise: [
        /^\s*[A-Z\s]+\s*:\s*[A-Z0-9\s]+\s*$/gm, // Key-value pairs
        /^\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*$/gm, // Table rows
        /^\s*[-=_]{3,}\s*$/gm, // Table separators
      ],

      // Graphical element artifacts
      graphicalNoise: [
        /^\s*[▪▫■□●○◆◇▲△▼▽]+\s*$/gm, // Bullet points and symbols
        /^\s*[┌┐└┘├┤┬┴┼│─]+\s*$/gm, // Box drawing characters
        /^\s*[░▒▓█]+\s*$/gm, // Block elements
      ],

      // OCR artifacts from stamps and seals
      stampArtifacts: [
        /^\s*[A-Z]{1,3}\s*[A-Z]{1,3}\s*[A-Z]{1,3}\s*$/gm, // Fragmented stamp text
        /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/gm, // Isolated dates
        /^\s*Rs\.?\s*\d+\s*$/gm, // Currency amounts from stamps
      ],
    }
  }

  /**
   * Advanced layout-aware filtering with region analysis
   */
  filterAdvancedLayoutNoise(text) {
    if (!text || typeof text !== "string") {
      return ""
    }

    console.log(`🎯 Starting advanced layout-aware filtering for text of length: ${text.length}`)

    // Step 1: Analyze document structure
    const documentStructure = this.analyzeDocumentStructure(text)
    console.log(`📊 Document structure analysis:`, documentStructure)

    // Step 2: Identify and extract body regions
    const bodyRegions = this.extractBodyRegions(text, documentStructure)
    console.log(`📄 Identified ${bodyRegions.length} body regions`)

    // Step 3: Filter each body region
    let filteredText = bodyRegions
      .map((region) => this.filterRegionNoise(region))
      .filter((region) => region.trim().length > 0)
      .join("\n\n")

    // Step 4: Final validation and cleanup
    filteredText = this.validateAndCleanup(filteredText, text)

    console.log(`✅ Advanced layout filtering completed. Final text length: ${filteredText.length}`)

    return filteredText
  }

  /**
   * Analyze document structure to identify regions
   */
  analyzeDocumentStructure(text) {
    const lines = text.split("\n")
    const totalLines = lines.length

    const structure = {
      hasHeaderRegion: false,
      hasFooterRegion: false,
      hasStampRegion: false,
      hasTabularContent: false,
      contractualContentStart: -1,
      estimatedBodyStart: 0,
      estimatedBodyEnd: totalLines,
    }

    // Analyze first 25% for header region
    const headerEndLine = Math.floor(totalLines * 0.25)
    const headerText = lines.slice(0, headerEndLine).join(" ").toLowerCase()

    // Check for header region indicators
    const headerIndicatorCount = this.layoutRegions.headerRegion.indicators.filter((pattern) =>
      pattern.test(headerText),
    ).length

    if (headerIndicatorCount >= 2) {
      structure.hasHeaderRegion = true
      structure.estimatedBodyStart = headerEndLine

      // Check for tabular structure in header
      const tabularPatterns = [/\|\s*[^|]+\s*\|/, /:\s*[A-Z0-9]+/, /[-=_]{5,}/]
      structure.hasTabularContent = tabularPatterns.some((pattern) => pattern.test(headerText))

      console.log(
        `📋 Header region detected (lines 0-${headerEndLine}) with tabular content: ${structure.hasTabularContent}`,
      )
    }

    // Analyze last 5% for footer region
    const footerStartLine = Math.floor(totalLines * 0.95)
    const footerText = lines.slice(footerStartLine).join(" ").toLowerCase()

    const footerIndicatorCount = this.layoutRegions.footerRegion.indicators.filter((pattern) =>
      pattern.test(footerText),
    ).length

    if (footerIndicatorCount >= 1) {
      structure.hasFooterRegion = true
      structure.estimatedBodyEnd = footerStartLine
      console.log(`📋 Footer region detected (lines ${footerStartLine}-${totalLines})`)
    }

    // Find first contractual content
    for (let i = structure.estimatedBodyStart; i < structure.estimatedBodyEnd; i++) {
      const line = lines[i].toLowerCase()
      if (this.contractualIndicators.some((indicator) => line.includes(indicator))) {
        structure.contractualContentStart = i
        console.log(`📄 First contractual content found at line ${i}`)
        break
      }
    }

    // Adjust body start if contractual content found after estimated start
    if (structure.contractualContentStart > structure.estimatedBodyStart) {
      structure.estimatedBodyStart = Math.max(structure.estimatedBodyStart, structure.contractualContentStart - 2)
    }

    return structure
  }

  /**
   * Extract body regions based on layout analysis
   */
  extractBodyRegions(text, structure) {
    const lines = text.split("\n")
    const bodyRegions = []

    // Extract main body region
    const bodyStart = structure.estimatedBodyStart
    const bodyEnd = structure.estimatedBodyEnd

    if (bodyStart < bodyEnd) {
      const bodyLines = lines.slice(bodyStart, bodyEnd)
      const bodyText = bodyLines.join("\n")

      // Further filter the body region
      const cleanBodyText = this.filterBodyRegionNoise(bodyText)

      if (cleanBodyText.trim().length > 100) {
        // Only include substantial content
        bodyRegions.push(cleanBodyText)
        console.log(`📄 Extracted body region: lines ${bodyStart}-${bodyEnd} (${cleanBodyText.length} chars)`)
      }
    }

    // If no substantial body region found, use conservative extraction
    if (bodyRegions.length === 0) {
      console.log("⚠️ No substantial body region found, using conservative extraction")
      const conservativeBody = this.conservativeBodyExtraction(text)
      if (conservativeBody.length > 0) {
        bodyRegions.push(conservativeBody)
      }
    }

    return bodyRegions
  }

  /**
   * Filter noise from identified body regions
   */
  filterBodyRegionNoise(bodyText) {
    let cleaned = bodyText

    // Remove advanced noise patterns
    Object.values(this.advancedNoisePatterns).forEach((patternGroup) => {
      patternGroup.forEach((pattern) => {
        cleaned = cleaned.replace(pattern, "")
      })
    })

    // Remove metadata patterns
    this.layoutRegions.metadataRegion.indicators.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, "")
    })

    // Remove isolated stamp/seal text
    const lines = cleaned.split("\n")
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim()

      // Skip very short lines that might be stamp artifacts
      if (trimmedLine.length < 10) {
        return false
      }

      // Skip lines that are all caps and short (likely stamp text)
      if (trimmedLine.length < 30 && trimmedLine === trimmedLine.toUpperCase()) {
        const hasContractualContent = this.contractualIndicators.some((indicator) =>
          trimmedLine.toLowerCase().includes(indicator),
        )
        return hasContractualContent
      }

      return true
    })

    return filteredLines.join("\n")
  }

  /**
   * Filter noise from individual regions
   */
  filterRegionNoise(regionText) {
    let cleaned = regionText

    // Apply all advanced noise patterns
    Object.values(this.advancedNoisePatterns).forEach((patternGroup) => {
      patternGroup.forEach((pattern) => {
        cleaned = cleaned.replace(pattern, " ")
      })
    })

    // Clean up whitespace
    cleaned = cleaned
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n")

    return cleaned
  }

  /**
   * Conservative body extraction fallback
   */
  conservativeBodyExtraction(text) {
    const lines = text.split("\n")
    const bodyLines = []

    let inContractualContent = false
    let contractualLineCount = 0

    for (const line of lines) {
      const lowerLine = line.toLowerCase()

      // Check if line contains contractual indicators
      const hasContractualContent = this.contractualIndicators.some((indicator) => lowerLine.includes(indicator))

      // Check if line contains obvious noise
      const hasObviousNoise = [
        /india non judicial/i,
        /government of/i,
        /e-?stamp/i,
        /aadhar no/i,
        /pan no/i,
        /page \d+/i,
      ].some((pattern) => pattern.test(line))

      if (hasContractualContent) {
        inContractualContent = true
        contractualLineCount++
      }

      if (inContractualContent && !hasObviousNoise && line.trim().length > 10) {
        bodyLines.push(line)
      }

      // Stop if we've found substantial contractual content and hit obvious noise again
      if (contractualLineCount > 5 && hasObviousNoise) {
        break
      }
    }

    return bodyLines.join("\n")
  }

  /**
   * Validate and cleanup final result
   */
  validateAndCleanup(filteredText, originalText) {
    // Check if too much content was removed
    const removalRatio = (originalText.length - filteredText.length) / originalText.length

    if (removalRatio > 0.8) {
      console.log("⚠️ Excessive content removal detected, using conservative approach")
      return this.conservativeBodyExtraction(originalText)
    }

    // Check for sufficient contractual content
    const lowerFiltered = filteredText.toLowerCase()
    const contractualCount = this.contractualIndicators.filter((indicator) => lowerFiltered.includes(indicator)).length

    if (contractualCount < 3 && filteredText.length < 500) {
      console.log("⚠️ Insufficient contractual content, using conservative approach")
      return this.conservativeBodyExtraction(originalText)
    }

    // Final cleanup
    return filteredText
      .replace(/\s{3,}/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim()
  }

  /**
   * Debug analysis for layout regions
   */
  analyzeLayoutRegions(text) {
    const analysis = {
      documentLength: text.length,
      structure: this.analyzeDocumentStructure(text),
      regions: {},
      noisePatterns: {},
    }

    // Analyze each region type
    Object.entries(this.layoutRegions).forEach(([regionName, regionConfig]) => {
      analysis.regions[regionName] = {
        detected: false,
        indicators: [],
        characteristics: {},
      }

      regionConfig.indicators.forEach((pattern) => {
        const matches = text.match(pattern)
        if (matches) {
          analysis.regions[regionName].detected = true
          analysis.regions[regionName].indicators.push({
            pattern: pattern.source,
            matches: matches.length,
            examples: matches.slice(0, 2),
          })
        }
      })
    })

    // Analyze noise patterns
    Object.entries(this.advancedNoisePatterns).forEach(([patternName, patterns]) => {
      analysis.noisePatterns[patternName] = []

      patterns.forEach((pattern) => {
        const matches = text.match(pattern)
        if (matches) {
          analysis.noisePatterns[patternName].push({
            pattern: pattern.source,
            matches: matches.length,
            examples: matches.slice(0, 2),
          })
        }
      })
    })

    return analysis
  }
}

// Create singleton instance
const advancedLayoutAwareFilter = new AdvancedLayoutAwareFilter()

/**
 * Main export function for advanced layout-aware filtering
 */
function filterAdvancedLayoutNoise(text) {
  try {
    return advancedLayoutAwareFilter.filterAdvancedLayoutNoise(text)
  } catch (error) {
    console.error("❌ Error in advanced layout-aware filtering:", error)
    return text
  }
}

/**
 * Analyze layout regions for debugging
 */
function analyzeAdvancedLayout(text) {
  try {
    return advancedLayoutAwareFilter.analyzeLayoutRegions(text)
  } catch (error) {
    console.error("❌ Error in advanced layout analysis:", error)
    return { error: error.message }
  }
}

module.exports = {
  filterAdvancedLayoutNoise,
  analyzeAdvancedLayout,
  AdvancedLayoutAwareFilter,
}
