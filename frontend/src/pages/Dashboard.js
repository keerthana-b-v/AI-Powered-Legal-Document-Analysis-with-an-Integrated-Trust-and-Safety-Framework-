"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Trash2, Plus, TrendingUp, BarChart } from "lucide-react"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"
import ModelEvaluation from "../components/ModelEvaluation"
import { documentService } from "../services/api"

const Dashboard = () => {
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [showEvaluation, setShowEvaluation] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [documentsResponse, statsResponse] = await Promise.all([
        documentService.getDocuments(),
        documentService.getStats(),
      ])

      setDocuments(documentsResponse.data.documents || documentsResponse.data)
      setStats(statsResponse.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return
    }

    setDeleting(id)
    try {
      await documentService.deleteDocument(id)
      setDocuments(documents.filter((doc) => doc._id !== id))
      toast.success("Document deleted successfully")
      // Refresh stats
      const statsResponse = await documentService.getStats()
      setStats(statsResponse.data)
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Failed to delete document")
    } finally {
      setDeleting(null)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Analyzed"
      case "processing":
        return "Processing"
      case "error":
        return "Error"
      case "extracting":
        return "Extracting"
      default:
        return "Uploaded"
    }
  }

  const getRiskBadge = (analysis) => {
    // Check if analysis exists and has riskLevel
    if (!analysis || !analysis.riskLevel) {
      return null
    }

    const riskLevel = analysis.riskLevel.toLowerCase()
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    }

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[riskLevel] || "bg-gray-100 text-gray-800"}`}
      >
        {riskLevel.toUpperCase()} RISK
      </span>
    )
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getDisplayName = (document) => {
    // If it's a batch upload, show the batch name
    if (document.mimeType === "batch/multiple" && document.batchName) {
      return document.batchName
    }
    // Otherwise show the original name
    return document.originalName
  }

  const getFileTypeDisplay = (document) => {
    if (document.mimeType === "batch/multiple") {
      const fileCount = document.metadata?.fileCount || 1
      return `Batch (${fileCount} files)`
    }

    switch (document.mimeType) {
      case "application/pdf":
        return "PDF"
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "DOCX"
      case "application/msword":
        return "DOC"
      case "text/plain":
        return "TXT"
      case "image/jpeg":
        return "JPG"
      case "image/png":
        return "PNG"
      default:
        return "Document"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Dashboard</h1>
          {/* <p className="text-gray-600 mt-1">Manage and analyze your legal documents</p> */}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowEvaluation(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <BarChart className="h-4 w-4" />
            <span>View Model Performance</span>
          </button>
          <Link
            to="/upload"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.overview?.totalDocuments || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Analyses</p>
                <p className="text-3xl font-bold text-green-600">{stats.overview?.completedAnalyses || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk Documents</p>
                <p className="text-3xl font-bold text-red-600">{stats.overview?.highRiskDocuments || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Analysis Rate</p>
                <p className="text-3xl font-bold text-blue-600">{stats.overview?.analysisRate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">Upload your first legal document to get started with AI-powered analysis</p>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <div key={document._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{getDisplayName(document)}</h3>
                      {document.mimeType === "batch/multiple" && document.metadata?.individualFiles && (
                        <p className="text-sm text-gray-500 truncate">
                          Files:{" "}
                          {document.metadata.individualFiles
                            .slice(0, 3)
                            .map((f) => f.originalName)
                            .join(", ")}
                          {document.metadata.individualFiles.length > 3 &&
                            ` +${document.metadata.individualFiles.length - 3} more`}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>•</span>
                        <span>{getFileTypeDisplay(document)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 flex-shrink-0">
                    {getRiskBadge(document.analysis)}

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(document.status)}
                      <span className="text-sm font-medium text-gray-700">{getStatusText(document.status)}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Link
                        to={`/document/${document._id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteDocument(document._id)}
                        disabled={deleting === document._id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Document"
                      >
                        {deleting === document._id ? <LoadingSpinner size="small" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {document.analysis && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Risk Score:</span>
                        <span className="ml-2 font-medium">{document.analysis.overallRiskScore || "N/A"}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Clauses Found:</span>
                        <span className="ml-2 font-medium">{document.analysis.clauses?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Missing Clauses:</span>
                        <span className="ml-2 font-medium">{document.analysis.missingClauses?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Recommendations:</span>
                        <span className="ml-2 font-medium">{document.analysis.recommendations?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Evaluation Modal */}
      {showEvaluation && <ModelEvaluation onClose={() => setShowEvaluation(false)} />}
    </div>
  )
}

export default Dashboard
