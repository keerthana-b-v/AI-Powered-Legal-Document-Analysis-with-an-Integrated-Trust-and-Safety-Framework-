import axios from "axios"

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("authToken")
      // window.location.href = '/login'
    }

    // Log error for debugging
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })

    return Promise.reject(error)
  },
)

// Document service
export const documentService = {
  // Upload document(s)
  uploadDocument: (formData, config = {}) => {
    return api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Increase timeout for multiple files
      ...config,
    })
  },

  // Get all documents
  getDocuments: (params = {}) => {
    return api.get("/documents", { params })
  },

  // Get specific document
  getDocument: (id) => {
    return api.get(`/documents/${id}`)
  },

  // Delete document
  deleteDocument: (id) => {
    return api.delete(`/documents/${id}`)
  },

  // Get document statistics
  getStats: () => {
    return api.get("/documents/stats/overview")
  },
}

// Analysis service
export const analysisService = {
  // Analyze document
  analyzeDocument: (id) => {
    return api.post(`/analysis/${id}/analyze`)
  },

  // Get analysis results
  getAnalysisResults: (id) => {
    return api.get(`/analysis/${id}/results`)
  },

  // Export analysis
  exportAnalysis: (id, format = "json") => {
    return api.get(`/analysis/${id}/export`, {
      params: { format },
    })
  },
}

// Trust & Safety service
export const trustSafetyService = {
  // Get dashboard data
  getDashboard: () => {
    return api.get("/trust-safety/dashboard")
  },

  // Privacy protection with enhanced scoring
  redactPII: (text) => {
    return api.post("/trust-safety/privacy/redact", { text })
  },

  // Enhanced fairness audit with per-class metrics
  runFairnessAudit: (data = {}) => {
    return api.post("/trust-safety/fairness/audit", data)
  },

  // Confidence scoring
  scoreConfidence: (text) => {
    return api.post("/trust-safety/confidence/score", { text })
  },

  // Human feedback collection
  submitFeedback: (feedbackData) => {
    return api.post("/trust-safety/feedback", feedbackData)
  },
}

export default api
