"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import { UploadIcon, FileText, AlertCircle, CheckCircle, X } from "lucide-react"
import toast from "react-hot-toast"
import { documentService } from "../services/api"

const Upload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [batchName, setBatchName] = useState("")
  const navigate = useNavigate()

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((file) => {
        file.errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(`${file.file.name}: File size must be less than 10MB`)
          } else if (error.code === "file-invalid-type") {
            toast.error(`${file.file.name}: Only PDF, DOC, DOCX, TXT, JPG, and PNG files are allowed`)
          } else if (error.code === "too-many-files") {
            toast.error("Maximum 5 files allowed per batch")
          } else {
            toast.error(`${file.file.name}: ${error.message}`)
          }
        })
      })
    }

    if (acceptedFiles.length === 0) return

    setSelectedFile(acceptedFiles) // Store array of files instead of single file
  }

  const handleUpload = async () => {
    if (!selectedFile || selectedFile.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()

      // Append all selected files
      selectedFile.forEach((file) => {
        formData.append("document", file)
      })

      // Add batch name if provided
      if (batchName.trim()) {
        formData.append("batchName", batchName.trim())
      }

      const response = await documentService.uploadDocument(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        },
      })

      toast.success(`${selectedFile.length} file(s) uploaded successfully!`)
      navigate(`/document/${response.data.documentId}`)
    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage = error.response?.data?.error || "Upload failed"
      toast.error(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: true, // Enable multiple file selection
    disabled: uploading,
    maxSize: 50 * 1024 * 1024, // 50MB per file (increased from 10MB)
    maxFiles: 50, // Maximum 50 files (increased from 5)
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Legal Document</h1>
        <p className="text-gray-600">
          Upload a PDF or DOCX file to analyze clauses, assess risks, and get AI-powered suggestions
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragActive && !isDragReject
            ? "border-blue-400 bg-blue-50 drag-active"
            : isDragReject
              ? "border-red-400 bg-red-50 drag-reject"
              : uploading
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <UploadIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
                  style={{
                    background: `conic-gradient(from 0deg, transparent ${
                      360 - (uploadProgress * 360) / 100
                    }deg, #3b82f6 ${360 - (uploadProgress * 360) / 100}deg)`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">Uploading document...</p>
              <p className="text-sm text-gray-500">Please wait while we process your file</p>
              <div className="mt-2 bg-gray-200 rounded-full h-2 w-48 mx-auto">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : selectedFile && selectedFile.length > 0 ? (
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {selectedFile.length} File{selectedFile.length > 1 ? "s" : ""} Selected
              </p>
              <div className="text-sm text-gray-500 space-y-1 mt-2">
                {selectedFile.map((file, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Total: {(selectedFile.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <UploadIcon className="h-16 w-16 text-gray-400 mx-auto" />
            {isDragActive ? (
              isDragReject ? (
                <div className="space-y-2">
                  <X className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-lg font-medium text-red-600">Invalid file type</p>
                  <p className="text-sm text-red-500">Only PDF and DOCX files are supported</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <CheckCircle className="h-8 w-8 text-blue-600 mx-auto" />
                  <p className="text-lg font-medium text-blue-600">Drop the file here...</p>
                </div>
              )
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700">Drag & drop documents here, or click to select</p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOC, DOCX, TXT, JPG, and PNG files up to 50MB each (max 50 files)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Batch Name Input - Shows after file selection */}
      {selectedFile && !uploading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Name (Optional)
          </label>
          <input
            type="text"
            id="batchName"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter a name for this document batch..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            maxLength={255}
          />
          <p className="text-xs text-gray-500 mt-1">
            Give your document batch a descriptive name for easy identification
          </p>

          <button
            onClick={handleUpload}
            className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upload & Analyze Document
          </button>
        </div>
      )}

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">What happens next?</h3>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• Document text will be extracted automatically</li>
                <li>• AI will identify and classify key clauses</li>
                <li>• Risk assessment will be performed</li>
                <li>• Suggestions for improvements will be generated</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-900">Important Notes</h3>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                <li>• This tool provides analysis for informational purposes only</li>
                <li>• Always consult with a qualified attorney for legal advice</li>
                <li>• Ensure documents don't contain sensitive personal information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Supported File Formats</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>PDF (.pdf)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Word (.docx, .doc)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Text (.txt)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Images (.jpg, .png)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Maximum file size: 50MB</p>
      </div>
    </div>
  )
}

export default Upload
