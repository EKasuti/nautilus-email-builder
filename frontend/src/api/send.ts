import { API_BASE_URL } from "@/config/api";

export interface Block {
  id: string;
  type: string;
  content: string;
  color?: string;
  fontSize?: number;
  align?: string;
  url?: string;
  src?: string;
  alt?: string;
}

export interface SendPayload {
  to: string;
  subject: string;
  blocks: Block[];
  template?: string;
  send_mode: "now" | "schedule";
}

export interface SendResult {
  success: boolean;
  id?: string;
  message: string;
}

export async function sendEmail(payload: SendPayload): Promise<SendResult> {
  const res = await fetch(`${API_BASE_URL}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail ?? "Failed to send email.");
  }

  return data as SendResult;
}

export async function fetchConfig(): Promise<{ from_email: string }> {
  const res = await fetch(`${API_BASE_URL}/api/config`);
  if (!res.ok) throw new Error("Could not load config.");
  return res.json();
}

export interface Group {
  id: string;
  name: string;
  count: number;
}

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch(`${API_BASE_URL}/api/groups`);
  if (!res.ok) throw new Error("Could not load groups.");
  return res.json();
}
