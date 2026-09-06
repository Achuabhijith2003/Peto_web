import { Routes, Route, Navigate } from "react-router-dom";

// import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPasswords";
import Community from "../pages/Community";
import CommunityDetail from "../pages/CommunityDetail";
import Social from "../pages/Social";
import CreateProfile from "../pages/CreateProfile";
import EditProfile from "../pages/EditProfile";
import Profile from "../pages/Profile";
import Bookmarks from "../pages/Bookmarks";
import SearchPage from "../pages/Search";
import Reels from "../pages/Reels";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Social />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/community" element={<Community />} />
      <Route path="/community/:id" element={<CommunityDetail />} />
      <Route path="/communities/:id" element={<CommunityDetail />} />
      <Route path="/social" element={<Social />} />
      <Route path="/reels" element={<Reels />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/create-profile" element={<CreateProfile />} />
      <Route path="/edit-profile" element={<EditProfile />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/profile/:id?" element={<Profile />} />
      <Route path="/bookmarks" element={<Bookmarks />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;