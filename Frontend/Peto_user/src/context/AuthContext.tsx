import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../utils/api";

import AuthPromptModal from "../components/auth/AuthPromptModal";

interface User {
  avatar_url: any;
  id: string;
  email: string;
  username: string;
  profile?: any;
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
        const userData = response.data.user || response.data;
        setUser({ ...userData, profile: response.data.profile });
      } catch (error) {
        console.error("User refresh failed:", error);
      }
    }
  };

  const updateUserProfile = (profileData: any) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedProfile = { ...(prev.profile || {}), ...profileData };
      return {
        ...prev,
        username: profileData.username || prev.username,
        avatar_url: profileData.avatar_url || prev.avatar_url,
        profile: updatedProfile,
      };
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("peto_token");
      if (token) {
        try {
          const response = await api.get("/users/me");
          const userData = response.data.user || response.data;
          setUser({ ...userData, profile: response.data.profile });
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
