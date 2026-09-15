import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { SystemStatusProvider } from "./context/SystemStatusContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SystemStatusProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SystemStatusProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);