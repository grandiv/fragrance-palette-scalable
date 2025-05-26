import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: (credentials) => apiClient.post("/api/auth/login", credentials),
    register: (userData) => apiClient.post("/api/auth/register", userData),
  },
  formulas: {
    generate: (description) =>
      apiClient.post("/api/formulas/generate", { description }),
    getStatus: (taskId) => apiClient.get(`/api/formulas/status/${taskId}`),
    getUserFormulas: (page = 1, limit = 10) =>
      apiClient.get(`/api/formulas?page=${page}&limit=${limit}`),
  },
};

// Backward compatibility exports
export const authAPI = api.auth;
export const formulaAPI = api.formulas;
