import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("peto_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration & automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("peto_refresh_token");

      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (refreshRes.data?.success && refreshRes.data?.token) {
            const newToken = refreshRes.data.token;
            const newRefreshToken = refreshRes.data.refreshToken;

            localStorage.setItem("peto_token", newToken);
            if (newRefreshToken) {
              localStorage.setItem("peto_refresh_token", newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          console.error("Session refresh failed:", refreshErr);
          localStorage.removeItem("peto_token");
          localStorage.removeItem("peto_refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
