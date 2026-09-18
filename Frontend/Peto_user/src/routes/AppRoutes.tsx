import { Routes, Route } from "react-router-dom";

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
import Maintenance503 from "../pages/Maintenance503";
import NotFound404 from "../pages/NotFound404";
import ServerError500 from "../pages/ServerError500";
import Forbidden403 from "../pages/Forbidden403";
import AdvertiserPortal from "../pages/advertiser/AdvertiserPortal";
import PolicyPage from "../pages/PolicyPage";
import Settings from "../pages/Settings";
import AuthCallback from "../pages/AuthCallback";
import GoogleLaunch from "../pages/GoogleLaunch";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Social />} />
      <Route path="/settings" element={<Settings />} />

      {/* Auth Launch & Callback for OAuth (Google) */}
      <Route path="/auth/google-launch" element={<GoogleLaunch />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Compliance & Legal Policies */}
      <Route path="/policies" element={<PolicyPage />} />
      <Route path="/policies/:slug" element={<PolicyPage />} />
      <Route path="/privacy-policy" element={<PolicyPage />} />
      <Route path="/terms-of-service" element={<PolicyPage />} />
      <Route path="/terms" element={<PolicyPage />} />
      <Route path="/privacy" element={<PolicyPage />} />
      <Route path="/community-guidelines" element={<PolicyPage />} />

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
      <Route path="/advertiser" element={<AdvertiserPortal />} />
      <Route path="/advertiser/*" element={<AdvertiserPortal />} />

      {/* System Status & Error Pages */}
      <Route path="/maintenance" element={<Maintenance503 />} />
      <Route path="/503" element={<Maintenance503 />} />
      <Route path="/forbidden" element={<Forbidden403 />} />
      <Route path="/403" element={<Forbidden403 />} />
      <Route path="/error" element={<ServerError500 />} />
      <Route path="/500" element={<ServerError500 />} />
      <Route path="/404" element={<NotFound404 />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
};

export default AppRoutes;