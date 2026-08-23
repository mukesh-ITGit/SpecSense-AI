import axios, { AxiosError } from 'axios';
import type { BatchJobResult, AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types';

// ---------------------------------------------------------------------------
// Base URL — configurable via VITE_API_BASE_URL in .env
// Default: http://127.0.0.1:8000/api/v1 (or relative /api/v1 if proxied)
// ---------------------------------------------------------------------------
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15-second standard request timeout
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT token from localStorage
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('specsense_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Helper: detect if an error is a network connection failure
// ---------------------------------------------------------------------------
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helper: Retry an async operation up to `maxRetries` on network failure
// ---------------------------------------------------------------------------
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 600
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isNetworkError(err)) {
        throw err;
      }
      // Exponential / stepped backoff
      await new Promise((res) => setTimeout(res, delayMs * attempt));
    }
  }
}

// ---------------------------------------------------------------------------
// Utility — extract a human-readable error message from an Axios error.
//
// Differentiates Network Errors, Invalid Credentials, Account Conflicts, etc.
// No hardcoded port assumptions.
// ---------------------------------------------------------------------------
export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ detail?: string }>;

    // Network error (backend not running / network down)
    if (!axiosErr.response) {
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        return "Connection timed out. SpecSense AI is temporarily unreachable.";
      }
      return "Can't reach SpecSense AI right now. Please verify the backend service is running.";
    }

    const status = axiosErr.response.status;
    const detail = axiosErr.response.data?.detail;

    // Prefer the server's own detail message when available and meaningful
    if (detail && typeof detail === 'string' && detail.length < 300) {
      return detail;
    }

    // Fall back to status-code-specific messages
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Incorrect email or password.';
      case 403:
        return 'Access denied. You do not have permission to access this resource.';
      case 404:
        return 'Authentication service endpoint not found. Please check API configuration.';
      case 409:
        return 'An account with this email already exists. Please sign in instead.';
      case 422:
        return 'Please check your email and password format.';
      case 429:
        return 'Too many login attempts. Please wait a few minutes and try again.';
      case 500:
        return 'Authentication service is temporarily unavailable. Please try again in a moment.';
      case 502:
      case 503:
      case 504:
        return 'The authentication service is temporarily offline. Please try again shortly.';
      default:
        return `Authentication failed (HTTP ${status}). Please try again.`;
    }
  }

  // Non-Axios error (programming error etc.)
  console.error('[SpecSense API] Non-Axios error:', error);
  return 'An unexpected error occurred. Please try again.';
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------
export const api = {
  // Health check — unauthenticated, with intelligent local port detection
  checkHealth: async (): Promise<{ status: string }> => {
    // 1. Try configured API_BASE_URL
    const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/health');
    try {
      const response = await axios.get<{ status: string }>(healthUrl, { timeout: 3000 });
      return response.data;
    } catch (primaryErr) {
      // 2. If running locally and primary port fails, probe candidate fallback ports (e.g. 8000, 8001)
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        const candidatePorts = ['8001', '8000'];
        for (const port of candidatePorts) {
          const testHealthUrl = `http://127.0.0.1:${port}/health`;
          if (testHealthUrl !== healthUrl) {
            try {
              const res = await axios.get<{ status: string }>(testHealthUrl, { timeout: 1500 });
              if (res.data && res.data.status === 'ok') {
                apiClient.defaults.baseURL = `http://127.0.0.1:${port}/api/v1`;
                return res.data;
              }
            } catch {
              // continue probing
            }
          }
        }
      }
      throw primaryErr;
    }
  },

  // Auth
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return withRetry(async () => {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    }, 1, 500);
  },

  register: async (userData: RegisterCredentials): Promise<AuthResponse> => {
    return withRetry(async () => {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData);
      return response.data;
    }, 1, 500);
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout backend errors — client-side session is cleared regardless
    }
  },

  // Products & Intelligence
  enrichProduct: async (rawText: string) => {
    const response = await apiClient.post('/products/enrich', { raw_text: rawText });
    return response.data;
  },

  uploadCatalog: async (file: File): Promise<BatchJobResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/products/upload', formData);
    return response.data;
  },

  getJobStatus: async (jobId: string): Promise<BatchJobResult> => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  getDashboardMetrics: async () => {
    const response = await apiClient.get('/metrics/dashboard');
    return response.data;
  },

  getActivities: async () => {
    const response = await apiClient.get('/activities');
    return response.data;
  },

  getProducts: async () => {
    const response = await apiClient.get('/products');
    return response.data;
  },

  getReviews: async () => {
    const response = await apiClient.get('/reviews');
    return response.data;
  },

  updateReview: async (productId: string, action: string, note: string = '') => {
    const response = await apiClient.post(`/reviews/${productId}/action`, { action, note });
    return response.data;
  },

  getConflicts: async () => {
    const response = await apiClient.get('/conflicts');
    return response.data;
  },

  resolveConflict: async (productId: string, action: string, value?: any) => {
    const response = await apiClient.post(`/conflicts/${productId}/resolve`, { action, value });
    return response.data;
  },

  getProductExplanation: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}/explanation`);
    return response.data;
  },

  downloadTemplate: () => {
    const csvContent =
      'product_name,description,part_number,brand,manufacturer,category\nSample Product,A sample description for testing,SAM-123,Acme,Acme Corp,Abrasives';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'specsense_catalog_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  getOverviewMetrics: async () => {
    const response = await apiClient.get('/metrics/dashboard');
    return response.data;
  },
};
