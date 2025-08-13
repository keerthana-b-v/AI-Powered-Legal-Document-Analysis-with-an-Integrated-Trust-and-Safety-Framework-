"use client"

import { useState, useEffect } from "react"
import { trustSafetyService } from "../services/api"

const TrustSafety = () => {
  const [activeTab, setActiveTab] = useState("privacy")
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Privacy Protection State
  const [privacyText, setPrivacyText] = useState("")
  const [privacyResults, setPrivacyResults] = useState(null)

  // Fairness Audit State
  const [fairnessResults, setFairnessResults] = useState(null)

  // Confidence Scoring State
  const [confidenceText, setConfidenceText] = useState("")
  const [confidenceResults, setConfidenceResults] = useState(null)

  // Human Feedback State
  const [feedbackData, setFeedbackData] = useState({
    originalText: "",
    modelPrediction: "",
    userCorrection: "",
    modelConfidence: 60,
  })
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await trustSafetyService.getDashboard()
      setDashboardData(response.data)
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    }
  }

  const handlePrivacyRedaction = async () => {
    if (!privacyText.trim()) return

    setLoading(true)
    try {
      const response = await trustSafetyService.redactPII(privacyText)
      setPrivacyResults(response.data)
    } catch (error) {
      console.error("Privacy redaction failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFairnessAudit = async () => {
    setLoading(true)
    try {
      const response = await trustSafetyService.runFairnessAudit()
      setFairnessResults(response.data)
    } catch (error) {
      console.error("Fairness audit failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfidenceScoring = async () => {
    if (!confidenceText.trim()) return

    setLoading(true)
    try {
      const response = await trustSafetyService.scoreConfidence(confidenceText)
      setConfidenceResults(response.data)
    } catch (error) {
      console.error("Confidence scoring failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedbackSubmit = async () => {
    setLoading(true)
    try {
      await trustSafetyService.submitFeedback(feedbackData)
      setFeedbackSubmitted(true)
      setTimeout(() => setFeedbackSubmitted(false), 3000)
    } catch (error) {
      console.error("Feedback submission failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">PII Redaction Tool</h3>
        <p className="text-gray-600 mb-4">
          Automatically detect and redact personally identifiable information from text.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Enter text to analyze:</label>
          <textarea
            value={privacyText}
            onChange={(e) => setPrivacyText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
            placeholder="John Smith, a software engineer at TechCorp Inc., can be reached at john.smith@techcorp.com or by phone at (555) 123-4567. His social security number is 123-45-6789 and he lives at 123 Main Street, New York, NY 10001."
          />
        </div>

        <button
          onClick={handlePrivacyRedaction}
          disabled={loading || !privacyText.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Redact PII"}
        </button>
      </div>

      {privacyResults && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Original Text:</h4>
            <p className="text-sm">{privacyResults.originalText}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Redacted Text:</h4>
            <p className="text-sm">{privacyResults.redactedText}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Privacy Analysis:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Privacy Score:</span>
                <div className="text-2xl font-bold text-blue-600">{privacyResults.score}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Compliance Level:</span>
                <div
                  className={`text-lg font-semibold ${
                    privacyResults.complianceLevel === "EXCELLENT"
                      ? "text-green-600"
                      : privacyResults.complianceLevel === "GOOD"
                        ? "text-blue-600"
                        : privacyResults.complianceLevel === "FAIR"
                          ? "text-yellow-600"
                          : privacyResults.complianceLevel === "POOR"
                            ? "text-orange-600"
                            : "text-red-600"
                  }`}
                >
                  {privacyResults.complianceLevel}
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            {privacyResults.breakdown && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">Score Calculation:</h5>
                <div className="text-sm space-y-1">
                  <div>
                    Baseline Score: <span className="font-medium">{privacyResults.breakdown.baseline}</span>
                  </div>
                  <div>Deductions:</div>
                  <ul className="ml-4 space-y-1">
                    {privacyResults.breakdown.deductions.map((deduction, index) => (
                      <li key={index} className="text-red-600">
                        Found {deduction.type}: <span className="font-medium">{deduction.value} points</span>
                        {deduction.text && <span className="text-gray-500"> ("{deduction.text}")</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t">
                    Final Score: <span className="font-medium">{privacyResults.score}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Detected Entities:</h4>
            <div className="flex flex-wrap gap-2">
              {privacyResults.entities.map((entity, index) => (
                <span key={index} className="bg-yellow-200 px-2 py-1 rounded text-sm">
                  {entity.text} ({entity.label})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderFairnessTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Model Fairness Audit</h3>
        <p className="text-gray-600 mb-4">Analyze model performance across different groups to detect bias.</p>

        <button
          onClick={handleFairnessAudit}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running Audit..." : "Run Fairness Audit"}
        </button>
      </div>

      {fairnessResults && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-semibold mb-4">Overall Metrics:</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(fairnessResults.overallMetrics.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(fairnessResults.overallMetrics.precision * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Precision</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(fairnessResults.overallMetrics.recall * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Recall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(fairnessResults.overallMetrics.f1Score * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">F1 Score</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-semibold mb-4">Per-Class Performance Metrics:</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Clause Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Precision</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Recall</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">F1-Score</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(fairnessResults.perClassMetrics).map(([className, metrics]) => (
                    <tr key={className} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">{className}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {(metrics.precision * 100).toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {(metrics.recall * 100).toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span
                          className={`font-medium ${
                            metrics["f1-score"] >= 0.95
                              ? "text-green-600"
                              : metrics["f1-score"] >= 0.9
                                ? "text-blue-600"
                                : metrics["f1-score"] >= 0.85
                                  ? "text-yellow-600"
                                  : "text-red-600"
                          }`}
                        >
                          {(metrics["f1-score"] * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{metrics.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Recommendations:</h4>
            <ul className="space-y-2">
              {fairnessResults.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className={`flex items-start space-x-2 ${
                    rec.type === "success"
                      ? "text-green-700"
                      : rec.type === "warning"
                        ? "text-yellow-700"
                        : "text-red-700"
                  }`}
                >
                  <span className="text-lg">{rec.type === "success" ? "✅" : rec.type === "warning" ? "⚠️" : "❌"}</span>
                  <span className="text-sm">{rec.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )

  const renderConfidenceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Confidence Scoring</h3>
        <p className="text-gray-600 mb-4">Assess the confidence level of model predictions.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Enter text to analyze:</label>
          <textarea
            value={confidenceText}
            onChange={(e) => setConfidenceText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
            placeholder="This contract shall terminate immediately upon 30 days written notice by either party. The monthly payment of $1,500 is due on the first day of each month."
          />
        </div>

        <button
          onClick={handleConfidenceScoring}
          disabled={loading || !confidenceText.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Score Confidence"}
        </button>
      </div>

      {confidenceResults && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-semibold mb-4">Analysis Results:</h4>
          <div className="space-y-2">
            <div>
              <strong>Prediction:</strong> {confidenceResults.prediction}
            </div>
            <div>
              <strong>Confidence Score:</strong> {(confidenceResults.confidenceScore * 100).toFixed(1)}%
            </div>
            <div>
              <strong>Confidence Level:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                  confidenceResults.confidenceLevel === "VERY_HIGH"
                    ? "bg-green-100 text-green-800"
                    : confidenceResults.confidenceLevel === "HIGH"
                      ? "bg-blue-100 text-blue-800"
                      : confidenceResults.confidenceLevel === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {confidenceResults.confidenceLevel}
              </span>
            </div>
            {confidenceResults.requiresReview && (
              <div className="text-orange-600 font-medium"> This prediction requires human review</div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderFeedbackTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Human Feedback Collection</h3>
        <p className="text-gray-600 mb-4">Submit corrections and feedback to improve model performance.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Original Text:</label>
            <textarea
              value={feedbackData.originalText}
              onChange={(e) => setFeedbackData({ ...feedbackData, originalText: e.target.value })}
              className="w-full h-20 p-3 border border-gray-300 rounded-md resize-none"
              placeholder="Payment shall be made within 30 days of invoice date"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model Prediction:</label>
              <input
                type="text"
                value={feedbackData.modelPrediction}
                onChange={(e) => setFeedbackData({ ...feedbackData, modelPrediction: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="duration"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correct Answer:</label>
              <input
                type="text"
                value={feedbackData.userCorrection}
                onChange={(e) => setFeedbackData({ ...feedbackData, userCorrection: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="payment"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model Confidence: {feedbackData.modelConfidence}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={feedbackData.modelConfidence}
              onChange={(e) => setFeedbackData({ ...feedbackData, modelConfidence: Number.parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <button
            onClick={handleFeedbackSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>

          {feedbackSubmitted && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
               Feedback submitted successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2"> Trust & Safety Dashboard</h1>
        <p className="text-gray-600">Monitor and ensure responsible AI deployment</p>
      </div>

      {/* Dashboard Summary Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Privacy Protection</h3>
              <p className="text-3xl font-bold text-green-600">
                {dashboardData?.privacyProtection?.entitiesRedacted || 0}
              </p>
              <p className="text-sm text-gray-500">Entities redacted from 0 documents</p>
            </div>
            <div className="text-green-500 text-3xl"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Fairness Audits</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardData?.fairnessAudits?.completedAudits || 0}</p>
              <p className="text-sm text-gray-500">Completed audits</p>
            </div>
            <div className="text-blue-500 text-3xl"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Human Feedback</h3>
              <p className="text-3xl font-bold text-purple-600">{dashboardData?.humanFeedback?.feedbackEntries || 0}</p>
              <p className="text-sm text-gray-500">Feedback entries collected</p>
            </div>
            <div className="text-purple-500 text-3xl"></div>
          </div>
        </div>
      </div> */}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "privacy", label: "Privacy Protection", icon: "" },
              { id: "fairness", label: "Fairness Audit", icon: "" },
              { id: "confidence", label: "Confidence Scoring", icon: "" },
              { id: "feedback", label: "Human Feedback", icon: "" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "privacy" && renderPrivacyTab()}
          {activeTab === "fairness" && renderFairnessTab()}
          {activeTab === "confidence" && renderConfidenceTab()}
          {activeTab === "feedback" && renderFeedbackTab()}
        </div>
      </div>
    </div>
  )
}

export default TrustSafety
