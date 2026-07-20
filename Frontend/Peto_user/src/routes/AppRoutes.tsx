import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import Community from "../pages/Community";
import Social from "../pages/Social";




const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/community" element={<Community />} />
      <Route path="/social" element={<Social />} />
    </Routes>
  );
};

export default AppRoutes;