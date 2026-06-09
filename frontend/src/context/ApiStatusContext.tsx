"use client";

import { createContext, useContext } from "react";
import { useHealth } from "@/hooks/useHealth";

type ApiStatus = "loading" | "ok" | "error";

const ApiStatusContext = createContext<ApiStatus>("loading");

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const status = useHealth();
  return (
    <ApiStatusContext.Provider value={status}>
      {children}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  return useContext(ApiStatusContext);
}
