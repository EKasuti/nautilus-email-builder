import { API_BASE_URL } from "@/config/api";

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("API unreachable");
  return res.json();
}
