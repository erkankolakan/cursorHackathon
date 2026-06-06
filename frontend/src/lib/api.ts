const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AccessibilityIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  confidence: number;
  recommendation?: string;
  legal_reference?: string;
  estimated_cost?: number;
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
  street_view_url?: string;
  anonymized_image_url?: string;
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

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

export interface DistrictStat {
  district: string;
  scan_count: number;
  avg_score: number;
  compliance_rate: number;
}

export interface TrendPoint {
  date: string;
  score: number;
  count: number;
}

export interface OrgStats {
  total_scans: number;
  critical_count: number;
  high_count: number;
  avg_score: number;
  compliance_rate: number;
  district_breakdown: DistrictStat[];
  trend_data: TrendPoint[];
}

let authToken: string | null = null;
let orgId: string | null = null;

export function setAuthToken(token: string) {
  if (!token || token === "undefined") return;
  authToken = token;
  if (typeof window !== "undefined") localStorage.setItem("kentscan_token", token);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

export function setOrgId(id: string) {
  if (!isValidUuid(id)) return;
  orgId = id;
  if (typeof window !== "undefined") localStorage.setItem("kentscan_org_id", id);
}

export function clearOrgId() {
  orgId = null;
  if (typeof window !== "undefined") localStorage.removeItem("kentscan_org_id");
}

export function logout() {
  authToken = null;
  orgId = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("kentscan_token");
    localStorage.removeItem("kentscan_org_id");
  }
}

export function loadStoredAuth() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("kentscan_token");
    authToken = stored && stored !== "undefined" ? stored : null;
    const storedOrg = localStorage.getItem("kentscan_org_id");
    orgId = isValidUuid(storedOrg) ? storedOrg : null;
    if (storedOrg && !isValidUuid(storedOrg)) {
      localStorage.removeItem("kentscan_org_id");
    }
  }
}

export function getOrgId() {
  return orgId;
}

export function isAuthenticated() {
  return !!authToken;
}

function authHeaders() {
  loadStoredAuth();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  if (orgId) h["X-Organization-ID"] = orgId;
  return h;
}

async function parseError(resp: Response, fallback: string): Promise<string> {
  const err = await resp.json().catch(() => ({}));
  const body = err as { message?: string; error?: string };
  return body.message || body.error || fallback;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const resp = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) throw new Error(await parseError(resp, "Giriş başarısız"));
  return resp.json();
}

export async function register(data: { email: string; password: string; first_name: string; last_name: string }) {
  const resp = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(await parseError(resp, "Kayıt başarısız"));
  return resp.json();
}

export async function createOrganization(name: string, slug: string): Promise<OrgInfo> {
  const resp = await fetch(`${API_URL}/api/v1/organizations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, slug }),
  });
  if (!resp.ok) throw new Error(await parseError(resp, "Organizasyon oluşturulamadı"));
  return resp.json();
}

export async function setupSession(email: string, password: string, orgIdInput?: string) {
  const session = await login(email, password);
  setAuthToken(session.token);

  if (isValidUuid(orgIdInput?.trim())) {
    setOrgId(orgIdInput!.trim());
    return session;
  }

  clearOrgId();
  const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase() || "belediye";
  const org = await createOrganization(`${slug} Belediyesi`, slug);
  if (!org?.id) throw new Error("Organizasyon oluşturuldu ama ID alınamadı");
  setOrgId(org.id);
  return session;
}

export async function ensureOrganization(email: string, password: string) {
  loadStoredAuth();
  if (isValidUuid(orgId) && authToken) return;
  if (!email || !password) {
    throw new Error("Oturum süresi doldu. Lütfen çıkış yapıp tekrar giriş yapın.");
  }
  await setupSession(email, password);
}

export async function createScan(req: CreateScanRequest): Promise<Scan> {
  const resp = await fetch(`${API_URL}/api/v1/scans`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(await parseError(resp, "Tarama başlatılamadı"));
  return resp.json();
}

export async function listScans(page = 1, limit = 50): Promise<PaginatedResponse<Scan>> {
  const resp = await fetch(`${API_URL}/api/v1/scans?page=${page}&limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error("Taramalar yüklenemedi");
  return resp.json();
}

export async function getScan(id: string): Promise<Scan> {
  const resp = await fetch(`${API_URL}/api/v1/scans/${id}`, { headers: authHeaders() });
  if (!resp.ok) throw new Error("Tarama bulunamadı");
  return resp.json();
}

export async function getStats(): Promise<OrgStats> {
  const resp = await fetch(`${API_URL}/api/v1/scans/stats`, { headers: authHeaders() });
  if (!resp.ok) throw new Error("İstatistikler yüklenemedi");
  return resp.json();
}

export function pollScanStatus(
  id: string,
  onUpdate: (scan: Scan) => void,
  intervalMs = 2000
): () => void {
  const timer = setInterval(async () => {
    try {
      const scan = await getScan(id);
      onUpdate(scan);
      if (scan.status === "completed" || scan.status === "failed") {
        clearInterval(timer);
      }
    } catch {
      // ignore poll errors
    }
  }, intervalMs);
  return () => clearInterval(timer);
}
