"use client";

export const VERCEL_TOKEN_KEY = "vercel_token";
export const VERCEL_HISTORY_KEY = "nca-vercel-deployments-v1";
export const VERCEL_PUSH_STATE_KEY = "nca-github-push-state-v1";

export type VercelDeployment = {
  id: string;
  name: string;
  url: string;
  inspectorUrl?: string;
  state: string;
  createdAt: number;
  repo?: string;
  projectName?: string;
  mode?: "github" | "direct";
};

export type VercelUser = { id: string; username?: string; email?: string; name?: string };

function isBrowser() { return typeof window !== "undefined"; }

export function getVercelToken() {
  if (!isBrowser()) return "";
  return localStorage.getItem(VERCEL_TOKEN_KEY) || "";
}

export function saveVercelToken(token: string) {
  if (!isBrowser()) return;
  const clean = token.trim();
  if (clean) localStorage.setItem(VERCEL_TOKEN_KEY, clean);
  else localStorage.removeItem(VERCEL_TOKEN_KEY);
}

export function clearVercelToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(VERCEL_TOKEN_KEY);
}

export async function validateVercelToken(token = getVercelToken()): Promise<VercelUser> {
  if (!isBrowser()) throw new Error("Vercel is available in the browser only.");
  if (!token) throw new Error("Paste a Vercel Access Token first.");
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || "Invalid Vercel token.");
  return data.user as VercelUser;
}

function readHistory(): Record<string, VercelDeployment[]> {
  if (!isBrowser()) return {};
  try { return JSON.parse(localStorage.getItem(VERCEL_HISTORY_KEY) || "{}"); } catch { return {}; }
}

export function getDeploymentHistory(chatId: string): VercelDeployment[] {
  if (!chatId) return [];
  return readHistory()[chatId] || [];
}

export function saveDeployment(chatId: string, deployment: VercelDeployment) {
  if (!isBrowser() || !chatId) return;
  const all = readHistory();
  all[chatId] = [deployment, ...(all[chatId] || [])].slice(0, 20);
  localStorage.setItem(VERCEL_HISTORY_KEY, JSON.stringify(all));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nca-vercel-deployed", { detail: deployment }));
}

export function getLastGitHubPush(chatId: string): { repo: string; pushedAt: number } | null {
  if (!isBrowser() || !chatId) return null;
  try {
    const all = JSON.parse(localStorage.getItem(VERCEL_PUSH_STATE_KEY) || "{}");
    return all[chatId] || null;
  } catch { return null; }
}

export function markGitHubPush(chatId: string, repo: string) {
  if (!isBrowser() || !chatId) return;
  try {
    const all = JSON.parse(localStorage.getItem(VERCEL_PUSH_STATE_KEY) || "{}");
    all[chatId] = { repo, pushedAt: Date.now() };
    localStorage.setItem(VERCEL_PUSH_STATE_KEY, JSON.stringify(all));
  } catch {}
}

function tokenOrThrow() {
  const token = getVercelToken();
  if (!token) throw new Error("Connect Vercel in Settings first.");
  return token;
}

async function vercelFetch(path: string, init?: RequestInit) {
  const token = tokenOrThrow();
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `Vercel API request failed (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

export type DeploymentOptions = {
  projectName: string;
  repo?: string;
  ref?: string;
  environment?: string[];
  files?: Array<{ path: string; content: string }>;
};

export async function createVercelDeployment(options: DeploymentOptions) {
  const body: Record<string, unknown> = {
    name: options.projectName.trim(),
    target: "production",
  };
  if (options.environment?.length) body.env = options.environment;

  if (options.repo) {
    body.gitSource = { type: "github", repo: options.repo, ref: options.ref || "main" };
    body.projectSettings = { framework: "nextjs" };
  } else if (options.files?.length) {
    body.files = options.files.map((file) => ({ file: file.path, data: file.content }));
    body.projectSettings = { framework: "nextjs" };
  } else {
    throw new Error("No GitHub repository or project files were supplied.");
  }

  return vercelFetch("/v13/deployments", { method: "POST", body: JSON.stringify(body) });
}

export async function getVercelDeployment(id: string) {
  return vercelFetch(`/v13/deployments/${encodeURIComponent(id)}`);
}

export function deploymentUrl(deployment: { url?: string }) {
  if (!deployment.url) return "";
  return deployment.url.startsWith("http") ? deployment.url : `https://${deployment.url}`;
}

export function deploymentLogsUrl(deployment: { inspectorUrl?: string; id?: string }) {
  if (deployment.inspectorUrl) return deployment.inspectorUrl;
  if (deployment.id) return `https://vercel.com/dashboard/deployments/${encodeURIComponent(deployment.id)}`;
  return "https://vercel.com/dashboard";
}
