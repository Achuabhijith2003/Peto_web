import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./routes/adminRoutes";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AdminAuthProvider>
          <AppRoutes />
        </AdminAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
