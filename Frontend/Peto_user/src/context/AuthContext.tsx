import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../utils/api";

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
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("peto_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("peto_token");
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
      }}
    >
      {children}
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
