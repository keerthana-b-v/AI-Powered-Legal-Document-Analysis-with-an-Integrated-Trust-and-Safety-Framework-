"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { FileText, Play, Clock, CheckCircle, AlertCircle, ArrowLeft, Download } from "lucide-react"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"
import { documentService, analysisService } from "../services/api"

const DocumentView = () => {
  const { id } = useParams()
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchDocument()
  }, [id])

  const fetchDocument = async () => {
    try {
      const response = await documentService.getDocument(id)
      setDocument(response.data)
    } catch (error) {
      console.error("Error fetching document:", error)
      toast.error("Failed to fetch document")
    } finally {
      setLoading(false)
    }
  }

  const startAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await analysisService.analyzeDocument(id)
      toast.success("Analysis completed!")

      // Refresh document data
      await fetchDocument()
    } catch (error) {
      console.error("Analysis error:", error)
      const errorMessage = error.response?.data?.error || "Analysis failed"
      toast.error(errorMessage)
    } finally {
      setAnalyzing(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "processing":
        return <Clock className="h-6 w-6 text-yellow-500 animate-spin" />
      case "extracting":
        return <Clock className="h-6 w-6 text-blue-500 animate-spin" />
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <FileText className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Analysis Complete"
      case "processing":
        return "Analyzing Document"
      case "extracting":
        return "Extracting Text"
      case "error":
        return "Error"
      default:
        return "Ready for Analysis"
    }
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
      return `Batch Upload (${fileCount} files)`
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
        <LoadingSpinner size="large" text="Loading document..." />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document not found</h3>
        <p className="text-gray-600 mb-4">The document you're looking for doesn't exist or has been deleted.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/" className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Document Details</h1>
      </div>

      {/* Document Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <FileText className="h-12 w-12 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getDisplayName(document)}</h2>
              <p className="text-gray-500">Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p>
              {document.mimeType === "batch/multiple" && document.metadata?.individualFiles && (
                <p className="text-sm text-gray-400 mt-1">
                  Files: {document.metadata.individualFiles.map((f) => f.originalName).join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusIcon(document.status)}
            <span className="text-lg font-medium text-gray-700">{getStatusText(document.status)}</span>
          </div>
        </div>

        {/* File Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">File Size</h3>
            <p className="text-lg text-gray-900">{formatFileSize(document.fileSize)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">File Type</h3>
            <p className="text-lg text-gray-900">{getFileTypeDisplay(document)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                document.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : document.status === "processing" || document.status === "extracting"
                    ? "bg-yellow-100 text-yellow-800"
                    : document.status === "error"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
              }`}
            >
              {getStatusText(document.status)}
            </span>
          </div>
        </div>

        {/* Batch File Details */}
        {document.mimeType === "batch/multiple" && document.metadata?.individualFiles && (
          <div className="mb-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {document.metadata.individualFiles.map((file, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">{file.originalName}</span>
                    <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {file.mimeType === "application/pdf"
                        ? "PDF"
                        : file.mimeType === "image/jpeg"
                          ? "JPG"
                          : file.mimeType === "image/png"
                            ? "PNG"
                            : file.mimeType === "text/plain"
                              ? "TXT"
                              : "DOC"}
                    </span>
                    {file.extractionError && <span className="text-xs text-red-500">Extraction failed</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Sections */}
        {document.status === "uploaded" && document.extractedText && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ready for Analysis</h3>
                <p className="text-gray-600">
                  Text has been extracted from your document{document.mimeType === "batch/multiple" ? "s" : ""}. Click
                  "Start Analysis" to identify clauses, assess risks, and get AI-powered suggestions.
                </p>
              </div>
              <button
                onClick={startAnalysis}
                disabled={analyzing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Start Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {document.status === "extracting" && (
          <div className="border-t pt-6">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="default" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Extracting Text</h3>
                <p className="text-gray-600">
                  We're extracting text from your document{document.mimeType === "batch/multiple" ? "s" : ""}. This may
                  take a few moments...
                </p>
              </div>
            </div>
          </div>
        )}

        {document.status === "processing" && (
          <div className="border-t pt-6">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="default" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analysis in Progress</h3>
                <p className="text-gray-600">
                  AI is analyzing your document{document.mimeType === "batch/multiple" ? "s" : ""} to identify clauses
                  and assess risks. This may take a few minutes...
                </p>
              </div>
            </div>
          </div>
        )}

        {document.status === "completed" && document.analysis && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analysis Complete</h3>
                <p className="text-gray-600">
                  Your document{document.mimeType === "batch/multiple" ? "s have" : " has"} been successfully analyzed.
                  View the detailed results.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.open(`/api/analysis/${document._id}/export`, "_blank")}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <Link
                  to={`/analysis/${document._id}`}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>View Results</span>
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Risk Score</h4>
                <p className="text-2xl font-bold text-gray-900">{document.analysis.overallRiskScore}/10</p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    document.analysis.riskLevel === "low"
                      ? "bg-green-100 text-green-800"
                      : document.analysis.riskLevel === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {document.analysis.riskLevel.toUpperCase()}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Clauses Found</h4>
                <p className="text-2xl font-bold text-gray-900">{document.analysis.clauses?.length || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Missing Clauses</h4>
                <p className="text-2xl font-bold text-red-600">{document.analysis.missingClauses?.length || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Recommendations</h4>
                <p className="text-2xl font-bold text-blue-600">{document.analysis.recommendations?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {document.status === "error" && (
          <div className="border-t pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
                <p className="text-red-600">{document.errorMessage || "An error occurred during analysis"}</p>
                <button
                  onClick={startAnalysis}
                  disabled={analyzing}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Preview */}
      {document.extractedText && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Text Preview</h3>
          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {document.extractedText.substring(0, 2000)}
              {document.extractedText.length > 2000 && "..."}
            </pre>
          </div>
          {document.extractedText.length > 2000 && (
            <p className="text-xs text-gray-500 mt-2">
              Showing first 2000 characters of {document.extractedText.length} total characters
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default DocumentView
