import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../utils/api";

import AuthPromptModal from "../components/auth/AuthPromptModal";

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  fullName?: string;
  avatar_url?: any;
  avatarUrl?: any;
  cover_url?: any;
  coverUrl?: any;
  profile?: any;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, arg2: any, arg3?: User) => void;
  logout: () => void;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (actionName?: string) => void;
  closeAuthModal: () => void;
  updateUserProfile: (profileData: any) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<string | undefined>();

  const openAuthModal = (actionName?: string) => {
    setModalAction(actionName);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setModalAction(undefined);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("peto_token");
    if (token) {
      try {
        const response = await api.get("/users/me");
        const profile = response.data.profile || {};
        const userData = response.data.user || response.data || {};
        const resolvedAvatar =
          profile.avatar_url ||
          profile.avatarUrl ||
          userData.avatar_url ||
          userData.avatarUrl ||
          null;
        const resolvedCover =
          profile.cover_url ||
          profile.coverUrl ||
          userData.cover_url ||
          userData.coverUrl ||
          null;

        setUser({
          ...userData,
          ...profile,
          avatar_url: resolvedAvatar,
          avatarUrl: resolvedAvatar,
          cover_url: resolvedCover,
          coverUrl: resolvedCover,
          profile: { ...(userData.profile || {}), ...profile, avatar_url: resolvedAvatar, cover_url: resolvedCover },
        });
      } catch (error) {
        console.error("User refresh failed:", error);
      }
    }
  };

  const updateUserProfile = (profileData: any) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedProfile = { ...(prev.profile || {}), ...profileData };
      const resolvedAvatar =
        profileData.avatar_url ||
        profileData.avatarUrl ||
        profileData.avatar ||
        prev.avatar_url;
      const resolvedCover =
        profileData.cover_url ||
        profileData.coverUrl ||
        profileData.cover ||
        prev.cover_url;

      return {
        ...prev,
        username: profileData.username || prev.username,
        avatar_url: resolvedAvatar,
        avatarUrl: resolvedAvatar,
        cover_url: resolvedCover,
        coverUrl: resolvedCover,
        profile: {
          ...updatedProfile,
          avatar_url: resolvedAvatar,
          cover_url: resolvedCover,
        },
      };
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("peto_token");
      if (token) {
        try {
          const response = await api.get("/users/me");
          const profile = response.data.profile || {};
          const userData = response.data.user || response.data || {};
          const resolvedAvatar =
            profile.avatar_url ||
            profile.avatarUrl ||
            userData.avatar_url ||
            userData.avatarUrl ||
            null;
          const resolvedCover =
            profile.cover_url ||
            profile.coverUrl ||
            userData.cover_url ||
            userData.coverUrl ||
            null;

          setUser({
            ...userData,
            ...profile,
            avatar_url: resolvedAvatar,
            avatarUrl: resolvedAvatar,
            cover_url: resolvedCover,
            coverUrl: resolvedCover,
            profile: { ...(userData.profile || {}), ...profile, avatar_url: resolvedAvatar, cover_url: resolvedCover },
          });
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("peto_token");
          localStorage.removeItem("peto_refresh_token");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, arg2: any, arg3?: User) => {
    let refreshToken: string | null | undefined = null;
    let userData: User;

    if (arg3 !== undefined) {
      refreshToken = arg2;
      userData = arg3;
    } else {
      userData = arg2;
    }

    localStorage.setItem("peto_token", token);
    if (refreshToken) {
      localStorage.setItem("peto_refresh_token", refreshToken);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("peto_token");
    localStorage.removeItem("peto_refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        updateUserProfile,
        refreshUser,
      }}
    >
      {children}
      <AuthPromptModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        actionName={modalAction}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
