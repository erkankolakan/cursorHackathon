const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AccessibilityIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  confidence: number;
}

export interface Scan {
  id: string;
  organization_id: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  status: "pending" | "processing" | "completed" | "failed";
  accessibility_score: number;
  compliance_level: string;
  issues: AccessibilityIssue[];
  street_view_url: string;
  error_message?: string;
  requested_by: string;
  created_at: string;
  completed_at?: string;
}

export interface CreateScanRequest {
  district: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

let authToken: string | null = null;
let orgId: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== "undefined") localStorage.setItem("kentscan_token", token);
}

export function setOrgId(id: string) {
  orgId = id;
  if (typeof window !== "undefined") localStorage.setItem("kentscan_org_id", id);
}

export function loadStoredAuth() {
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("kentscan_token");
    orgId = localStorage.getItem("kentscan_org_id");
  }
}

export function getOrgId() {
  return orgId;
}

export function isAuthenticated() {
  return !!authToken;
}

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  if (orgId) h["X-Organization-ID"] = orgId;
  return h;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const resp = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) throw new Error("Giriş başarısız");
  return resp.json();
}

export async function register(data: { email: string; password: string; first_name: string; last_name: string }) {
  const resp = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Kayıt başarısız");
  return resp.json();
}

export async function createScan(req: CreateScanRequest): Promise<Scan> {
  const resp = await fetch(`${API_URL}/api/v1/scans`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || "Tarama başlatılamadı");
  }
  return resp.json();
}

export async function listScans(page = 1, limit = 20): Promise<PaginatedResponse<Scan>> {
  const resp = await fetch(`${API_URL}/api/v1/scans?page=${page}&limit=${limit}`, {
    headers: headers(),
  });
  if (!resp.ok) throw new Error("Taramalar yüklenemedi");
  return resp.json();
}

export async function getScan(id: string): Promise<Scan> {
  const resp = await fetch(`${API_URL}/api/v1/scans/${id}`, { headers: headers() });
  if (!resp.ok) throw new Error("Tarama bulunamadı");
  return resp.json();
}
