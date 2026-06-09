"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/api/health";

export function useHealth() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetchHealth()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return status;
}
