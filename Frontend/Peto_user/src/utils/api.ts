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
    const userCountry = localStorage.getItem("peto_user_country");
    const userRegion = localStorage.getItem("peto_user_region");
    const userState = localStorage.getItem("peto_user_state");
    const userDistrict = localStorage.getItem("peto_user_district");
    if (userCountry) config.headers["x-user-country"] = userCountry;
    if (userRegion) config.headers["x-user-region"] = userRegion;
    if (userState) config.headers["x-user-state"] = userState;
    if (userDistrict) config.headers["x-user-district"] = userDistrict;

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
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

    // Handle Controlled Maintenance Mode (HTTP 503)
    if (
      error.response?.status === 503 &&
      (error.response?.data?.maintenance || error.response?.data?.message?.toLowerCase().includes("maintenance"))
    ) {
      const msg = error.response?.data?.message;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("peto:maintenance", {
            detail: { message: msg },
          })
        );
      }
      return Promise.reject(error);
    }

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
