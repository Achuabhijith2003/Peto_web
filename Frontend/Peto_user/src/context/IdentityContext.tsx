import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

export interface ManagedBusiness {
  id: string;
  name: string;
  legal_name: string;
  country_code: string;
  website_url?: string;
  business_type?: string;
  business_category?: string;
  description?: string;
  role: string;
  can_manage_verification: boolean;
  identityType: "BUSINESS";
  verification: {
    verified: boolean;
    type: "BUSINESS_VERIFIED" | null;
    status: string;
    verified_at?: string | null;
  };
  is_verified: boolean;
}

export interface ActiveIdentity {
  type: "PERSON" | "BUSINESS";
  id: string;
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
  badgeType?: "PERSON_VERIFIED" | "BUSINESS_VERIFIED" | null;
  role?: string;
  business?: ManagedBusiness;
}

interface IdentityContextType {
  activeIdentity: ActiveIdentity;
  managedBusinesses: ManagedBusiness[];
  loadingBusinesses: boolean;
  switchIdentity: (type: "PERSON" | "BUSINESS", businessId?: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [managedBusinesses, setManagedBusinesses] = useState<ManagedBusiness[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const getPersonalIdentity = useCallback((): ActiveIdentity => {
    return {
      type: "PERSON",
      id: user?.id || "",
      name: user?.profile?.full_name || user?.username || "Personal Profile",
      avatarUrl: user?.profile?.avatar_url,
      isVerified: !!(user?.profile?.is_verified || (user as any)?.verified),
      badgeType: (user?.profile?.is_verified || (user as any)?.verified) ? "PERSON_VERIFIED" : null,
    };
  }, [user]);

  const [activeIdentity, setActiveIdentity] = useState<ActiveIdentity>(getPersonalIdentity());

  const refreshBusinesses = useCallback(async () => {
    if (!isAuthenticated) {
      setManagedBusinesses([]);
      return;
    }
    try {
      setLoadingBusinesses(true);
      const res = await api.get("/businesses/me");
      if (res.data?.success && Array.isArray(res.data.businesses)) {
        setManagedBusinesses(res.data.businesses);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoadingBusinesses(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshBusinesses();
    } else {
      setManagedBusinesses([]);
      setActiveIdentity({
        type: "PERSON",
        id: "",
        name: "Guest",
      });
    }
  }, [isAuthenticated, refreshBusinesses]);

  // Synchronize active identity if personal profile changes or saved in localStorage
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const saved = localStorage.getItem("peto_active_acting_identity");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.type === "BUSINESS" && parsed.id) {
          const matchedBiz = managedBusinesses.find((b) => b.id === parsed.id);
          if (matchedBiz) {
            setActiveIdentity({
              type: "BUSINESS",
              id: matchedBiz.id,
              name: matchedBiz.name,
              isVerified: matchedBiz.is_verified,
              badgeType: matchedBiz.is_verified ? "BUSINESS_VERIFIED" : null,
              role: matchedBiz.role,
              business: matchedBiz,
            });
            return;
          }
        }
      } catch {
        // Fallback to personal
      }
    }

    setActiveIdentity(getPersonalIdentity());
  }, [user, isAuthenticated, managedBusinesses, getPersonalIdentity]);

  const switchIdentity = (type: "PERSON" | "BUSINESS", businessId?: string) => {
    if (type === "BUSINESS" && businessId) {
      const biz = managedBusinesses.find((b) => b.id === businessId);
      if (biz) {
        const newIdentity: ActiveIdentity = {
          type: "BUSINESS",
          id: biz.id,
          name: biz.name,
          isVerified: biz.is_verified,
          badgeType: biz.is_verified ? "BUSINESS_VERIFIED" : null,
          role: biz.role,
          business: biz,
        };
        setActiveIdentity(newIdentity);
        localStorage.setItem("peto_active_acting_identity", JSON.stringify({ type: "BUSINESS", id: biz.id }));
        return;
      }
    }

    // Default: Personal
    const personal = getPersonalIdentity();
    setActiveIdentity(personal);
    localStorage.setItem("peto_active_acting_identity", JSON.stringify({ type: "PERSON", id: user?.id }));
  };

  return (
    <IdentityContext.Provider
      value={{
        activeIdentity,
        managedBusinesses,
        loadingBusinesses,
        switchIdentity,
        refreshBusinesses,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return context;
};
