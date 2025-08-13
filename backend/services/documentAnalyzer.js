const OpenAI = require("openai")
const { analyzeDocumentEnhanced } = require("./enhancedDocumentAnalyzer")

// Check if we should use mock mode
const MOCK_MODE =
  !process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY === "your_openai_api_key_here" ||
  process.env.OPENAI_API_KEY.length < 10

let openai
if (!MOCK_MODE) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  } catch (error) {
    console.error("OpenAI initialization error:", error)
  }
}

// Enhanced clause types with descriptions
const CLAUSE_TYPES = {
  termination: {
    name: "Termination",
    description: "Clauses defining how and when the contract can be ended",
    keywords: ["terminate", "termination", "end", "expire", "dissolution"],
  },
  payment: {
    name: "Payment",
    description: "Clauses related to payment terms, amounts, and schedules",
    keywords: ["payment", "pay", "invoice", "fee", "cost", "price", "compensation"],
  },
  liability: {
    name: "Liability",
    description: "Clauses defining responsibility and liability limits",
    keywords: ["liability", "liable", "damages", "responsible", "indemnify", "limitation"],
  },
  confidentiality: {
    name: "Confidentiality",
    description: "Clauses protecting confidential information",
    keywords: ["confidential", "non-disclosure", "proprietary", "secret", "nda"],
  },
  intellectual_property: {
    name: "Intellectual Property",
    description: "Clauses related to IP rights and ownership",
    keywords: ["intellectual property", "copyright", "trademark", "patent", "ip rights"],
  },
  dispute_resolution: {
    name: "Dispute Resolution",
    description: "Clauses defining how disputes will be resolved",
    keywords: ["dispute", "arbitration", "mediation", "court", "litigation"],
  },
  force_majeure: {
    name: "Force Majeure",
    description: "Clauses covering unforeseeable circumstances",
    keywords: ["force majeure", "act of god", "unforeseeable", "natural disaster"],
  },
  governing_law: {
    name: "Governing Law",
    description: "Clauses specifying applicable law and jurisdiction",
    keywords: ["governing law", "jurisdiction", "applicable law", "venue"],
  },
}

// Export the enhanced analyzer as the main analyzer
async function analyzeDocument(text, options = {}) {
  try {
    console.log("🚀 Using enhanced document analyzer with BERT + GPT improvements")
    return await analyzeDocumentEnhanced(text, options)
  } catch (error) {
    console.error("❌ Enhanced analyzer failed, this should not happen in production:", error)
    throw error
  }
}

// Re-export enhanced analyzer functions for direct access
const {
  extractClausesWithBERT,
  calculateEnhancedClauseRisk,
  identifyEnhancedRiskFactors,
  generateEnhancedClauseSuggestions,
  ENHANCED_CLAUSE_TYPES,
} = require("./enhancedDocumentAnalyzer")

module.exports = {
  analyzeDocument,
  extractClausesWithBERT,
  calculateEnhancedClauseRisk,
  identifyEnhancedRiskFactors,
  generateEnhancedClauseSuggestions,
  CLAUSE_TYPES: ENHANCED_CLAUSE_TYPES,
}
