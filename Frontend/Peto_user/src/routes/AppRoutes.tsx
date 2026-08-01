import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import Community from "../pages/Community";
import Social from "../pages/Social";
import CreateProfile from "../pages/CreateProfile";
import Profile from "../pages/Profile";
import Bookmarks from "../pages/Bookmarks";
import SearchPage from "../pages/Search";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/community" element={<Community />} />
      <Route path="/social" element={<Social />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/create-profile" element={<CreateProfile />} />
      <Route path="/profile/:id?" element={<Profile />} />
      <Route path="/bookmarks" element={<Bookmarks />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;