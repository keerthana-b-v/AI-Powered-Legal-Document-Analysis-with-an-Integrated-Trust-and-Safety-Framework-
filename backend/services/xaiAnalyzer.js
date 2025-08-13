/**
 * XAI (Explainable AI) Analyzer Service
 * Identifies risk-triggering words and provides explanations for AI decisions
 */

const fs = require("fs")
const path = require("path")

// Load prompt handbook
const promptHandbook = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/promptHandbook.json"), "utf8"))

class XAIAnalyzer {
  constructor() {
    this.promptHandbook = promptHandbook.promptHandbook

    // Enhanced risk trigger patterns with explanations
    this.riskTriggers = {
      // High-impact triggers
      unlimited: {
        weight: 4.0,
        reason: "Creates unlimited liability exposure with no financial protection",
        category: "liability",
      },
      "sole discretion": {
        weight: 3.5,
        reason: "Gives one party complete control without checks and balances",
        category: "control",
      },
      "without notice": {
        weight: 3.0,
        reason: "Eliminates advance warning and preparation time",
        category: "notice",
      },
      immediate: {
        weight: 3.0,
        reason: "Provides no grace period or time to cure issues",
        category: "timing",
      },
      "non-refundable": {
        weight: 2.5,
        reason: "Creates non-recoverable financial obligations",
        category: "financial",
      },
      "auto-renewal": {
        weight: 2.5,
        reason: "Forces automatic contract extension without active consent",
        category: "duration",
      },
      indemnify: {
        weight: 3.0,
        reason: "Creates broad obligation to compensate for damages and legal costs",
        category: "liability",
      },
      waive: {
        weight: 3.5,
        reason: "Eliminates important legal rights and protections",
        category: "rights",
      },
      perpetual: {
        weight: 3.0,
        reason: "Creates indefinite obligations with no end date",
        category: "duration",
      },
      irrevocable: {
        weight: 3.0,
        reason: "Prevents future modifications or cancellation",
        category: "flexibility",
      },
      "personal guarantee": {
        weight: 4.0,
        reason: "Creates personal liability beyond business obligations",
        category: "liability",
      },
      "structural repairs": {
        weight: 2.5,
        reason: "May impose major unexpected maintenance costs",
        category: "maintenance",
      },
      "no alterations": {
        weight: 2.0,
        reason: "Severely limits property use flexibility and improvements",
        category: "restrictions",
      },
      "mandatory arbitration": {
        weight: 2.5,
        reason: "Limits legal recourse options and jury trial rights",
        category: "dispute",
      },
      binding: {
        weight: 2.0,
        reason: "Creates enforceable obligations that cannot be easily changed",
        category: "enforceability",
      },
      forfeit: {
        weight: 3.0,
        reason: "Risk of losing money or property without compensation",
        category: "financial",
      },
      penalty: {
        weight: 2.5,
        reason: "Additional financial punishment beyond actual damages",
        category: "financial",
      },
      exclusive: {
        weight: 2.0,
        reason: "Limits options and creates dependency on single party",
        category: "restrictions",
      },
    }

    // Positive factors that reduce risk
    this.riskMitigators = {
      reasonable: {
        weight: -0.5,
        reason: "Provides standard of reasonableness and fairness",
        category: "fairness",
      },
      mutual: {
        weight: -0.7,
        reason: "Creates balanced obligations for both parties",
        category: "balance",
      },
      "written consent": {
        weight: -0.4,
        reason: "Requires formal agreement and documentation",
        category: "process",
      },
      "good faith": {
        weight: -0.6,
        reason: "Requires honest and fair dealing between parties",
        category: "fairness",
      },
      "commercially reasonable": {
        weight: -0.8,
        reason: "Applies industry standard business practices",
        category: "standards",
      },
      "industry standard": {
        weight: -0.6,
        reason: "Follows accepted industry practices and norms",
        category: "standards",
      },
      "liability cap": {
        weight: -1.0,
        reason: "Limits maximum financial exposure and damages",
        category: "protection",
      },
      "cure period": {
        weight: -0.8,
        reason: "Provides time to fix problems before penalties",
        category: "fairness",
      },
      notice: {
        weight: -0.5,
        reason: "Provides advance warning and preparation time",
        category: "process",
      },
    }
  }

  /**
   * Analyze text for risk triggers and generate XAI explanations
   */
  analyzeRiskTriggers(text, clauseType) {
    const triggers = []
    const lowerText = text.toLowerCase()

    // Find risk triggers
    Object.entries(this.riskTriggers).forEach(([trigger, info]) => {
      const regex = new RegExp(`\\b${trigger.toLowerCase()}\\b`, "gi")
      let match

      while ((match = regex.exec(text)) !== null) {
        triggers.push({
          word: trigger,
          startIndex: match.index,
          endIndex: match.index + trigger.length,
          reason: info.reason,
          weight: info.weight,
          category: info.category,
          type: "risk",
        })
      }
    })

    // Find risk mitigators
    Object.entries(this.riskMitigators).forEach(([mitigator, info]) => {
      const regex = new RegExp(`\\b${mitigator.toLowerCase()}\\b`, "gi")
      let match

      while ((match = regex.exec(text)) !== null) {
        triggers.push({
          word: mitigator,
          startIndex: match.index,
          endIndex: match.index + mitigator.length,
          reason: info.reason,
          weight: info.weight,
          category: info.category,
          type: "mitigator",
        })
      }
    })

    // Add clause-type specific triggers
    if (this.promptHandbook.clauseTypePrompts[clauseType]) {
      const clausePrompt = this.promptHandbook.clauseTypePrompts[clauseType]
      if (clausePrompt.xaiTriggers) {
        clausePrompt.xaiTriggers.forEach((trigger) => {
          const regex = new RegExp(`\\b${trigger.toLowerCase()}\\b`, "gi")
          let match

          while ((match = regex.exec(text)) !== null) {
            // Avoid duplicates
            const exists = triggers.some(
              (t) => t.startIndex === match.index && t.word.toLowerCase() === trigger.toLowerCase(),
            )

            if (!exists) {
              triggers.push({
                word: trigger,
                startIndex: match.index,
                endIndex: match.index + trigger.length,
                reason: `${clauseType} clause risk factor: ${trigger}`,
                weight: 2.0,
                category: clauseType,
                type: "clause_specific",
              })
            }
          }
        })
      }
    }

    // Sort by position in text
    return triggers.sort((a, b) => a.startIndex - b.startIndex)
  }

  /**
   * Generate systematic AI prompt using handbook
   */
  generateSystematicPrompt(clause) {
    const clauseType = clause.type
    const riskLevel = clause.riskLevel?.toLowerCase() || "medium"

    // Get A-grade clause-specific prompts
    const clausePrompts =
      this.promptHandbook.clauseTypePrompts[clauseType] || this.promptHandbook.clauseTypePrompts.default

    // Get risk-level modifiers
    const riskModifiers =
      this.promptHandbook.riskLevelModifiers[riskLevel] || this.promptHandbook.riskLevelModifiers.medium

    // Build A-grade systematic prompt
    const systematicPrompt = `
You are a senior legal advisor with 15+ years of contract negotiation experience. Provide expert-level analysis of this ${clauseType.replace("_", " ")} clause.

CLAUSE ANALYSIS CONTEXT:
- Clause Type: ${clauseType.replace("_", " ").toUpperCase()}
- Risk Level: ${riskLevel.toUpperCase()} (${clause.riskScore}/10)
- Content: "${clause.content}"
- Identified Risk Factors: ${clause.riskFactors?.join(", ") || "None specified"}

EXPERT ANALYSIS FRAMEWORK:

1. TARGETED LEGAL ANALYSIS:
${clausePrompts.targetedQuestion}

2. RISK ASSESSMENT:
Focus on: ${clausePrompts.riskFocus}

3. EXPERT GUIDANCE:
${clausePrompts.expertGuidance}

4. URGENCY LEVEL:
${riskModifiers.urgencyPrefix}${riskModifiers.actionIntensifier}

REQUIRED OUTPUT (JSON):
{
  "suggestion": "${riskModifiers.urgencyPrefix}[Specific, expert-level recommendation with exact language suggestions - max 250 words]",
  "justification": "Clear legal and business rationale for this recommendation - max 150 words",
  "riskReduction": "Specific explanation of how this reduces identified risks - max 100 words",
  "specificLanguage": "Exact contract language or specific terms to negotiate - max 150 words",
  "urgency": "${riskLevel}",
  "actionItems": ["Specific negotiation point 1", "Specific negotiation point 2", "Specific negotiation point 3"],
  "expectedOutcome": "${clausePrompts.actionableOutcome}"
}

REQUIREMENTS:
- Provide specific dollar amounts, timeframes, and percentages where applicable
- Include exact contract language suggestions
- Focus on practical, negotiable terms
- Address the specific risks identified in the clause content
- Ensure recommendations are implementable by legal counsel

Be extremely specific and actionable. Avoid generic advice.
`

    return systematicPrompt
  }

  /**
   * Calculate XAI-based risk score
   */
  calculateXAIRiskScore(triggers, baseRiskScore) {
    let xaiAdjustment = 0

    triggers.forEach((trigger) => {
      if (trigger.type === "risk" || trigger.type === "clause_specific") {
        xaiAdjustment += trigger.weight * 0.3 // Scale down the impact
      } else if (trigger.type === "mitigator") {
        xaiAdjustment += trigger.weight * 0.3 // Negative weights reduce risk
      }
    })

    const adjustedScore = baseRiskScore + xaiAdjustment
    return Math.max(1, Math.min(10, adjustedScore))
  }

  /**
   * Generate XAI explanation summary
   */
  generateXAIExplanation(triggers, clauseType) {
    const riskTriggers = triggers.filter((t) => t.type === "risk" || t.type === "clause_specific")
    const mitigators = triggers.filter((t) => t.type === "mitigator")

    let explanation = ""

    if (riskTriggers.length > 0) {
      explanation += `Risk factors identified: ${riskTriggers.length} trigger(s) found. `
      explanation += `Key concerns include ${riskTriggers
        .slice(0, 3)
        .map((t) => `"${t.word}"`)
        .join(", ")}. `
    }

    if (mitigators.length > 0) {
      explanation += `Positive factors: ${mitigators.length} risk mitigator(s) found including ${mitigators
        .slice(0, 2)
        .map((t) => `"${t.word}"`)
        .join(", ")}. `
    }

    if (riskTriggers.length === 0 && mitigators.length === 0) {
      explanation = `No specific risk triggers identified in this ${clauseType} clause. Risk assessment based on clause type and content analysis.`
    }

    return explanation
  }

  /**
   * Get clause-specific prompt template
   */
  getClausePromptTemplate(clauseType) {
    return this.promptHandbook.clauseTypePrompts[clauseType] || null
  }

  /**
   * Get risk level prompt template
   */
  getRiskLevelPromptTemplate(riskLevel) {
    return this.promptHandbook.riskLevelPrompts[riskLevel] || null
  }
}

// Create singleton instance
const xaiAnalyzer = new XAIAnalyzer()

/**
 * Main export functions
 */
function analyzeRiskTriggers(text, clauseType) {
  return xaiAnalyzer.analyzeRiskTriggers(text, clauseType)
}

function generateSystematicPrompt(clause) {
  return xaiAnalyzer.generateSystematicPrompt(clause)
}

function calculateXAIRiskScore(triggers, baseRiskScore) {
  return xaiAnalyzer.calculateXAIRiskScore(triggers, baseRiskScore)
}

function generateXAIExplanation(triggers, clauseType) {
  return xaiAnalyzer.generateXAIExplanation(triggers, clauseType)
}

module.exports = {
  analyzeRiskTriggers,
  generateSystematicPrompt,
  calculateXAIRiskScore,
  generateXAIExplanation,
  XAIAnalyzer,
}
