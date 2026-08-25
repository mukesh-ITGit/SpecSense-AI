import axios, { AxiosError } from 'axios';
import type {
  BatchJobResult,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types';

// ---------------------------------------------------------------------------
// Base URL — configurable via VITE_API_BASE_URL in .env
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
// Helper: detect network connection failure
// ---------------------------------------------------------------------------
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return (
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED'
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Helper: Retry an async operation on network failure
// ---------------------------------------------------------------------------
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 600,
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

      await new Promise((res) =>
        setTimeout(res, delayMs * attempt),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Utility — extract human-readable authentication error
// ---------------------------------------------------------------------------
export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr =
      error as AxiosError<{ detail?: string }>;

    // Network error
    if (!axiosErr.response) {
      if (
        axiosErr.code === 'ECONNABORTED' ||
        axiosErr.message?.includes('timeout')
      ) {
        return 'Connection timed out. SpecSense AI is temporarily unreachable.';
      }

      return "Can't reach SpecSense AI right now. Please verify the backend service is running.";
    }

    const status = axiosErr.response.status;
    const detail = axiosErr.response.data?.detail;

    // Backend-provided message
    if (
      detail &&
      typeof detail === 'string' &&
      detail.length < 300
    ) {
      return detail;
    }

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

  console.error('[SpecSense API] Non-Axios error:', error);

  return 'An unexpected error occurred. Please try again.';
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------
export const api = {
  // -------------------------------------------------------------------------
  // Health check
  //
  // IMPORTANT:
  // The deployed backend root is confirmed to respond successfully.
  // Therefore we do NOT depend only on /health.
  // -------------------------------------------------------------------------
  checkHealth: async (): Promise<{ status: string }> => {
    const configuredUrl = API_BASE_URL.replace(/\/+$/, '');

    // Backend root:
    // https://specsense-backend.onrender.com
    const backendRootUrl = configuredUrl.replace(
      /\/api\/v1$/,
      '',
    );

    // 1. First check backend root.
    // Your Render backend currently responds here.
    try {
      const response = await axios.get(backendRootUrl, {
        timeout: 5000,
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          status:
            response.data?.status ||
            response.data?.message ||
            'ok',
        };
      }
    } catch (rootError) {
      console.warn(
        '[SpecSense API] Backend root health check failed:',
        rootError,
      );
    }

    // 2. If root fails, try /health.
    try {
      const healthUrl = `${backendRootUrl}/health`;

      const response = await axios.get(healthUrl, {
        timeout: 5000,
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          status: response.data?.status || 'ok',
        };
      }
    } catch (healthError) {
      console.warn(
        '[SpecSense API] /health check failed:',
        healthError,
      );
    }

    // 3. Local development fallback.
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      const candidatePorts = ['8001', '8000'];

      for (const port of candidatePorts) {
        const testHealthUrl =
          `http://127.0.0.1:${port}/health`;

        try {
          const response = await axios.get<{
            status?: string;
          }>(testHealthUrl, {
            timeout: 1500,
          });

          if (response.status >= 200 && response.status < 300) {
            apiClient.defaults.baseURL =
              `http://127.0.0.1:${port}/api/v1`;

            return {
              status: response.data?.status || 'ok',
            };
          }
        } catch {
          // Continue checking next local port.
        }
      }
    }

    throw new Error(
      'SpecSense backend is unreachable.',
    );
  },

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: async (
    credentials: LoginCredentials,
  ): Promise<AuthResponse> => {
    return withRetry(
      async () => {
        const response =
          await apiClient.post<AuthResponse>(
            '/auth/login',
            credentials,
          );

        return response.data;
      },
      1,
      500,
    );
  },

  register: async (
    userData: RegisterCredentials,
  ): Promise<AuthResponse> => {
    return withRetry(
      async () => {
        const response =
          await apiClient.post<AuthResponse>(
            '/auth/register',
            userData,
          );

        return response.data;
      },
      1,
      500,
    );
  },

  getMe: async (): Promise<User> => {
    const response =
      await apiClient.get<User>('/auth/me');

    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout backend errors.
    }
  },

  // -------------------------------------------------------------------------
  // Products & Intelligence
  // -------------------------------------------------------------------------
  enrichProduct: async (rawText: string) => {
    const response = await apiClient.post(
      '/products/enrich',
      {
        raw_text: rawText,
      },
    );

    return response.data;
  },

  uploadCatalog: async (
    file: File,
  ): Promise<BatchJobResult> => {
    const formData = new FormData();

    formData.append('file', file);

    const response =
      await apiClient.post<BatchJobResult>(
        '/products/upload',
        formData,
      );

    return response.data;
  },

  getJobStatus: async (
    jobId: string,
  ): Promise<BatchJobResult> => {
    const response =
      await apiClient.get(`/jobs/${jobId}`);

    return response.data;
  },

  getDashboardMetrics: async () => {
    const response =
      await apiClient.get('/metrics/dashboard');

    return response.data;
  },

  getActivities: async () => {
    const response =
      await apiClient.get('/activities');

    return response.data;
  },

  getProducts: async () => {
    const response =
      await apiClient.get('/products');

    return response.data;
  },

  getReviews: async () => {
    const response =
      await apiClient.get('/reviews');

    return response.data;
  },

  updateReview: async (
    productId: string,
    action: string,
    note: string = '',
  ) => {
    const response =
      await apiClient.post(
        `/reviews/${productId}/action`,
        {
          action,
          note,
        },
      );

    return response.data;
  },

  getConflicts: async () => {
    const response =
      await apiClient.get('/conflicts');

    return response.data;
  },

  resolveConflict: async (
    productId: string,
    action: string,
    value?: any,
  ) => {
    const response =
      await apiClient.post(
        `/conflicts/${productId}/resolve`,
        {
          action,
          value,
        },
      );

    return response.data;
  },

  getProductExplanation: async (
    productId: string,
  ) => {
    const response =
      await apiClient.get(
        `/products/${productId}/explanation`,
      );

    return response.data;
  },

  downloadTemplate: () => {
    const csvContent =
      'product_name,description,part_number,brand,manufacturer,category\n' +
      'Sample Product,A sample description for testing,SAM-123,Acme,Acme Corp,Abrasives';

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;',
      },
    );

    const link =
      document.createElement('a');

    link.href =
      URL.createObjectURL(blob);

    link.setAttribute(
      'download',
      'specsense_catalog_template.csv',
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  },

  getOverviewMetrics: async () => {
    const response =
      await apiClient.get(
        '/metrics/dashboard',
      );

    return response.data;
  },
};