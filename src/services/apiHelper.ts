import axios, { AxiosInstance } from 'axios';

/**
 * Dynamically resolves the API base URL based on the environment and runtime context.
 * In a co-located serverless or container deployment, targeting window.location.origin/api
 * ensures requests always rout to the same host.
 */
export const getApiBaseUrl = (): string => {
  // If a custom API base URL is explicitly defined in environment variables, use that.
  const envApiUrl = ((import.meta as any).env?.VITE_API_BASE_URL) || ((import.meta as any).env?.VITE_APP_URL);
  if (envApiUrl) {
    return envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`;
  }

  // In the browser, co-locate with the current window origin.
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api`;
  }

  // Fallback default
  return '/api';
};

/**
 * Centralized Axios instance configured for the Serverless Gateway mapping.
 * All requests through this client are prefixed and routed correctly.
 */
export const apiHelper: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to ensure we never duplicate /api/ in the path when baseURL is set
apiHelper.interceptors.request.use(
  (config) => {
    if (config.url) {
      // If the URL already starts with /api/, strip it since baseURL includes it
      if (config.url.startsWith('/api/')) {
        config.url = config.url.substring(5);
      } else if (config.url === '/api') {
        config.url = '';
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiHelper;
