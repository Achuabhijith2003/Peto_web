import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import axios from "axios";
import { Maintenance503 } from "../pages/Maintenance503";

interface SystemStatusContextType {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  triggerMaintenance: (message?: string) => void;
  clearMaintenance: () => void;
  checkHealth: () => Promise<boolean>;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

export const SystemStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    "Peto is currently undergoing scheduled maintenance. Please check back shortly."
  );

  const triggerMaintenance = useCallback((message?: string) => {
    setIsMaintenanceMode(true);
    if (message) {
      setMaintenanceMessage(message);
    }
  }, []);

  const clearMaintenance = useCallback(() => {
    setIsMaintenanceMode(false);
  }, []);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || "/api";
      const healthUrl = apiBase.replace(/\/api\/?$/, "") + "/health";
      const res = await axios.get(healthUrl, { timeout: 6000 });

      if (res.data?.maintenance === true || res.data?.status === "MAINTENANCE") {
        setIsMaintenanceMode(true);
        if (res.data?.message) {
          setMaintenanceMessage(res.data.message);
        }
        return false;
      } else {
        setIsMaintenanceMode(false);
        return true;
      }
    } catch (err: any) {
      // If health check specifically returns 503 with maintenance payload
      if (err.response?.status === 503 && err.response?.data?.maintenance) {
        setIsMaintenanceMode(true);
        if (err.response?.data?.message) {
          setMaintenanceMessage(err.response.data.message);
        }
        return false;
      }
      return false;
    }
  }, []);

  // Initial check on application mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Global window event listener for Axios 503 interceptor
  useEffect(() => {
    const handleMaintenanceEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      triggerMaintenance(customEvent.detail?.message);
    };

    window.addEventListener("peto:maintenance", handleMaintenanceEvent);
    return () => {
      window.removeEventListener("peto:maintenance", handleMaintenanceEvent);
    };
  }, [triggerMaintenance]);

  return (
    <SystemStatusContext.Provider
      value={{
        isMaintenanceMode,
        maintenanceMessage,
        triggerMaintenance,
        clearMaintenance,
        checkHealth,
      }}
    >
      {isMaintenanceMode ? (
        <Maintenance503
          message={maintenanceMessage}
          onResolved={() => {
            clearMaintenance();
            window.location.reload();
          }}
        />
      ) : (
        children
      )}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = (): SystemStatusContextType => {
  const context = useContext(SystemStatusContext);
  if (!context) {
    throw new Error("useSystemStatus must be used within a SystemStatusProvider");
  }
  return context;
};

export default SystemStatusContext;
