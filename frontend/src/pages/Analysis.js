"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Download, Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"
import { documentService, analysisService } from "../services/api"

// Add this function before the main component:
const renderHighlightedText = (text, highlightedWords) => {
  if (!highlightedWords || highlightedWords.length === 0) {
    return text
  }

  // Sort highlights by start index
  const sortedHighlights = [...highlightedWords].sort((a, b) => a.startIndex - b.startIndex)

  const parts = []
  let lastIndex = 0

  sortedHighlights.forEach((highlight, index) => {
    // Add text before highlight
    if (highlight.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, highlight.startIndex))
    }

    // Determine highlight color based on type
    const highlightClass = highlight.type === "mitigator" ? "bg-green-200 px-1 rounded" : "bg-yellow-200 px-1 rounded"

    // Add highlighted text with XAI tooltip
    parts.push(
      <span
        key={`highlight-${index}`}
        className={`${highlightClass} relative group cursor-help`}
        title={highlight.reason}
      >
        {text.substring(highlight.startIndex, highlight.endIndex)}

        {/* XAI Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap max-w-xs">
          <div className="font-medium mb-1">XAI Analysis:</div>
          <div>{highlight.reason}</div>
          <div className="text-xs text-gray-300 mt-1">
            Weight: {highlight.weight > 0 ? "+" : ""}
            {highlight.weight} | Category: {highlight.category}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </span>,
    )

    lastIndex = highlight.endIndex
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return <>{parts}</>
}

const Analysis = () => {
  const { id } = useParams()
  const [document, setDocument] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalysis()
  }, [id])

  const fetchAnalysis = async () => {
    try {
      const [docResponse, analysisResponse] = await Promise.all([
        documentService.getDocument(id),
        analysisService.getAnalysisResults(id),
      ])

      setDocument(docResponse.data)
      setAnalysis(analysisResponse.data.analysis)
    } catch (error) {
      console.error("Error fetching analysis:", error)
      toast.error("Failed to fetch analysis results")
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      const response = await analysisService.exportAnalysis(id)
      // Create download link
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `analysis-report-${document.originalName}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Report exported successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export report")
    }
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getClauseTypeDisplayName = (type) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" text="Loading analysis results..." />
      </div>
    )
  }

  if (!document || !analysis) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis not found</h3>
        <p className="text-gray-600 mb-4">
          The analysis results are not available or the document hasn't been analyzed yet.
        </p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  // Prepare chart data
  const clauseTypeData = analysis.clauses.reduce((acc, clause) => {
    const type = getClauseTypeDisplayName(clause.type)
    const existing = acc.find((item) => item.name === type)
    if (existing) {
      existing.count += 1
      existing.avgRisk = (existing.avgRisk + clause.riskScore) / 2
    } else {
      acc.push({ name: type, count: 1, avgRisk: clause.riskScore })
    }
    return acc
  }, [])

  const riskDistributionData = [
    { name: "Low Risk", value: analysis.clauses.filter((c) => c.riskScore <= 3).length, color: "#10b981" },
    {
      name: "Medium Risk",
      value: analysis.clauses.filter((c) => c.riskScore > 3 && c.riskScore <= 7).length,
      color: "#f59e0b",
    },
    { name: "High Risk", value: analysis.clauses.filter((c) => c.riskScore > 7).length, color: "#ef4444" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to={`/document/${document._id}`}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
            <p className="text-gray-600">{document.originalName}</p>
          </div>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Risk Score</p>
              <p className={`text-3xl font-bold ${getRiskColor(analysis.riskLevel)}`}>{analysis.overallRiskScore}/10</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRiskBadgeColor(analysis.riskLevel)}`}
              >
                {analysis.riskLevel.toUpperCase()} RISK
              </span>
            </div>
            <AlertTriangle className={`h-8 w-8 ${getRiskColor(analysis.riskLevel)}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clauses Identified</p>
              <p className="text-3xl font-bold text-blue-600">{analysis.clauses.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missing Clauses</p>
              <p className="text-3xl font-bold text-red-600">{analysis.missingClauses.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processing Time</p>
              <p className="text-3xl font-bold text-gray-900">{Math.round(analysis.processingTime / 1000)}s</p>
            </div>
            <Clock className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Summary</h2>
        <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clause Types Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clause Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clauseTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-blue-900">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Clauses */}
      {analysis.missingClauses.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Missing Standard Clauses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.missingClauses.map((clauseType, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-red-900 font-medium">{getClauseTypeDisplayName(clauseType)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Clause Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Detailed Clause Analysis</h2>
        <div className="space-y-6">
          {Object.entries(
            analysis.clauses.reduce((groups, clause) => {
              const type = getClauseTypeDisplayName(clause.type)
              if (!groups[type]) groups[type] = []
              groups[type].push(clause)
              return groups
            }, {}),
          ).map(([clauseType, clauses]) => (
            <div key={clauseType} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {clauseType} Clauses ({clauses.length})
              </h3>

              <div className="space-y-4">
                {clauses.map((clause, index) => (
                  <div key={clause.id || index} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(clause.priority)}`}
                          >
                            {clause.priority.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">Source: {clause.sourceFile || "document.pdf"}</span>
                        </div>

                        {/* Clause text with XAI highlighted risk triggers */}
                        <div className="mb-3">
                          <p className="text-gray-700 leading-relaxed">
                            {clause.highlightedWords && clause.highlightedWords.length > 0
                              ? renderHighlightedText(clause.text || clause.content, clause.highlightedWords)
                              : clause.text || clause.content}
                          </p>

                          {/* XAI Explanation */}
                          {clause.xaiExplanation && (
                            <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                              <strong>AI Explanation:</strong> {clause.xaiExplanation}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-gray-900">{clause.riskScore}/10</div>
                        <div className="text-xs text-gray-500">Risk Score</div>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRiskBadgeColor(clause.riskLevel?.toLowerCase() || "medium")}`}
                        >
                          {clause.riskLevel || "MEDIUM"} RISK
                        </span>
                      </div>
                    </div>

                    {clause.riskFactors && clause.riskFactors.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Factors:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {clause.riskFactors.map((factor, factorIndex) => (
                            <li key={factorIndex} className="text-sm text-red-700">
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Suggestion with XAI justification */}
                    {clause.suggestion && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">AI Suggestion:</h4>
                            <p className="text-sm text-blue-800 mb-2">{clause.suggestion}</p>
                          </div>

                          {/* XAI Justification Tooltip */}
                          {clause.justification && (
                            <div className="relative group">
                              <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>

                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-64">
                                <div className="font-medium mb-1">Why this suggestion?</div>
                                <div>{clause.justification}</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Legacy suggestions support */}
                    {clause.suggestions && clause.suggestions.length > 0 && !clause.suggestion && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {clause.suggestions.map((suggestion, suggestionIndex) => (
                            <li key={suggestionIndex} className="text-sm text-blue-700">
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Analysis
