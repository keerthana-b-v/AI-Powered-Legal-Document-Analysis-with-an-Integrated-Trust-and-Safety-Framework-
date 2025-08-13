"use client"

import React, { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertCircle, CheckCircle, TrendingUp, Database, RefreshCw, Download } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

const ModelEvaluation = ({ onClose }) => {
  const [evaluationData, setEvaluationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false)

  useEffect(() => {
    fetchEvaluationResults()
  }, [])

  const fetchEvaluationResults = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/evaluation/results")
      const data = await response.json()

      if (data.success) {
        setEvaluationData(data.data)
        if (data.isMock) {
          console.log("Using mock evaluation data")
        }
      } else {
        throw new Error(data.error || "Failed to fetch evaluation results")
      }
    } catch (err) {
      console.error("Error fetching evaluation results:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runNewEvaluation = async () => {
    try {
      setIsRunningEvaluation(true)
      setError(null)

      const response = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setEvaluationData(data.data)
      } else {
        throw new Error(data.error || "Failed to run evaluation")
      }
    } catch (err) {
      console.error("Error running evaluation:", err)
      setError(err.message)
    } finally {
      setIsRunningEvaluation(false)
    }
  }

  const downloadResults = () => {
    if (!evaluationData) return

    const dataStr = JSON.stringify(evaluationData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `model_evaluation_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatMetric = (value) => {
    return typeof value === "number" ? value.toFixed(3) : "N/A"
  }

  const getMetricColor = (value, type = "default") => {
    if (typeof value !== "number") return "text-gray-500"

    if (type === "accuracy" || type === "f1") {
      if (value >= 0.9) return "text-green-600"
      if (value >= 0.8) return "text-blue-600"
      if (value >= 0.7) return "text-yellow-600"
      return "text-red-600"
    }

    return "text-gray-700"
  }

  const prepareChartData = () => {
    if (!evaluationData?.per_class_metrics) return []

    return Object.entries(evaluationData.per_class_metrics).map(([clauseType, metrics]) => ({
      name: clauseType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      precision: metrics.precision,
      recall: metrics.recall,
      f1_score: metrics.f1_score,
      support: metrics.support,
    }))
  }

  const renderOverview = () => {
    if (!evaluationData) return null

    const { overall_metrics, evaluation_metadata } = evaluationData

    return (
      <div className="space-y-6">
        {/* Overall Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Accuracy</p>
                <p className={`text-3xl font-bold ${getMetricColor(overall_metrics.accuracy, "accuracy")}`}>
                  {formatMetric(overall_metrics.accuracy)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Macro F1-Score</p>
                <p className={`text-3xl font-bold ${getMetricColor(overall_metrics.macro_f1, "f1")}`}>
                  {formatMetric(overall_metrics.macro_f1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weighted F1-Score</p>
                <p className={`text-3xl font-bold ${getMetricColor(overall_metrics.weighted_f1, "f1")}`}>
                  {formatMetric(overall_metrics.weighted_f1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Samples</p>
                <p className="text-3xl font-bold text-gray-900">{evaluation_metadata.total_samples}</p>
              </div>
              <Database className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Evaluation Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Dataset:</span>
              <span className="ml-2 text-gray-900">
                {evaluation_metadata.dataset || "CUAD Test Split + Synthetic Examples"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Model:</span>
              <span className="ml-2 text-gray-900">Fine-tuned BERT for Clause Classification</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Classes:</span>
              <span className="ml-2 text-gray-900">{evaluation_metadata.num_classes}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Evaluation Date:</span>
              <span className="ml-2 text-gray-900">
                {new Date(evaluation_metadata.evaluation_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Per-Class Performance Metrics</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(value) => [formatMetric(value), ""]} />
                <Legend />
                <Bar dataKey="precision" fill="#3B82F6" name="Precision" />
                <Bar dataKey="recall" fill="#10B981" name="Recall" />
                <Bar dataKey="f1_score" fill="#8B5CF6" name="F1-Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  const renderMetricsTable = () => {
    if (!evaluationData?.per_class_metrics) return null

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clause Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precision
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recall
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  F1-Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Support
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(evaluationData.per_class_metrics).map(([clauseType, metrics]) => (
                <tr key={clauseType} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {clauseType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={getMetricColor(metrics.precision)}>{formatMetric(metrics.precision)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={getMetricColor(metrics.recall)}>{formatMetric(metrics.recall)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={getMetricColor(metrics.f1_score, "f1")}>{formatMetric(metrics.f1_score)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metrics.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderConfusionMatrix = () => {
    if (!evaluationData?.confusion_matrix) return null

    const clauseTypes = Object.keys(evaluationData.confusion_matrix)
    const maxValue = Math.max(...Object.values(evaluationData.confusion_matrix).flatMap((row) => Object.values(row)))

    const getCellColor = (value) => {
      const intensity = value / maxValue
      if (intensity === 0) return "bg-gray-50"
      if (intensity < 0.2) return "bg-blue-100"
      if (intensity < 0.4) return "bg-blue-200"
      if (intensity < 0.6) return "bg-blue-300"
      if (intensity < 0.8) return "bg-blue-400"
      return "bg-blue-500"
    }

    const getTextColor = (value) => {
      const intensity = value / maxValue
      return intensity > 0.6 ? "text-white" : "text-gray-900"
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confusion Matrix</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${clauseTypes.length}, 60px)` }}>
              {/* Header row */}
              <div className="p-2"></div>
              {clauseTypes.map((type) => (
                <div key={`header-${type}`} className="p-2 text-xs font-medium text-center transform -rotate-45">
                  {type.replace(/_/g, " ").substring(0, 8)}
                </div>
              ))}

              {/* Data rows */}
              {clauseTypes.map((trueType) => (
                <React.Fragment key={trueType}>
                  <div className="p-2 text-xs font-medium text-right">
                    {trueType.replace(/_/g, " ").substring(0, 15)}
                  </div>
                  {clauseTypes.map((predType) => {
                    const value = evaluationData.confusion_matrix[trueType][predType] || 0
                    return (
                      <div
                        key={`${trueType}-${predType}`}
                        className={`p-2 text-xs text-center ${getCellColor(value)} ${getTextColor(value)} border border-gray-200`}
                        title={`True: ${trueType}, Predicted: ${predType}, Count: ${value}`}
                      >
                        {value}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Note:</strong> Rows represent true labels, columns represent predicted labels. Darker colors
            indicate higher values.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="large" text="Loading model evaluation results..." />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Evaluation Error</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={fetchEvaluationResults}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-t-lg px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Model Performance Evaluation</h2>
            <p className="text-gray-600 mt-1">BERT Clause Classification Model Analysis</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={runNewEvaluation}
              disabled={isRunningEvaluation}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRunningEvaluation ? "animate-spin" : ""}`} />
              <span>{isRunningEvaluation ? "Running..." : "Run New Evaluation"}</span>
            </button>
            <button
              onClick={downloadResults}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Results</span>
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white px-6 border-b border-gray-200">
          <div className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "metrics", label: "Detailed Metrics" },
              { id: "confusion", label: "Confusion Matrix" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "metrics" && renderMetricsTable()}
          {activeTab === "confusion" && renderConfusionMatrix()}
        </div>
      </div>
    </div>
  )
}

export default ModelEvaluation
