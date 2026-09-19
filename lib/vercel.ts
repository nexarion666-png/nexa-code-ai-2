"use client";

export const VERCEL_TOKEN_KEY = "vercel_token";
export const VERCEL_HISTORY_KEY = "nca-vercel-deployments-v1";
export const VERCEL_PUSH_STATE_KEY = "nca-github-push-state-v1";
export const GITHUB_REPO_ID_KEY_PREFIX = "github_repo_id_";

export type VercelDeployment = {
  id: string;
  name: string;
  url: string;
  inspectorUrl?: string;
  state?: string;
  readyState?: string;
  createdAt: number | string;
  repo?: string;
  projectName?: string;
  mode?: "github" | "direct";
  chatId?: string;
  [k: string]: any;
};

export type VercelUser = { id: string; username?: string; email?: string; name?: string };

function isBrowser() { return typeof window!== "undefined"; }

export function getVercelToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(VERCEL_TOKEN_KEY);
}
export function saveVercelToken(t: string) {
  if (!isBrowser()) return;
  localStorage.setItem(VERCEL_TOKEN_KEY, t);
}
export function clearVercelToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(VERCEL_TOKEN_KEY);
}

export async function validateVercelToken(token: string): Promise<VercelUser> {
  const res = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Invalid Vercel token");
  const data = await res.json();
  const u = data.user || data;
  return { id: u.id, username: u.username, email: u.email, name: u.name };
}

// --- GitHub push state (used by vercel-ui.tsx) ---
export function getLastGitHubPush(chatId: string): { repo: string; at: number } | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(VERCEL_PUSH_STATE_KEY) || localStorage.getItem("nca-github-push-state-v1") || "{}";
    const map = JSON.parse(raw);
    return map[chatId] || null;
  } catch { return null; }
}

// --- Deployment History (chat-scoped) ---
export function getDeploymentHistory(chatId?: string): VercelDeployment[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(VERCEL_HISTORY_KEY) || "[]";
    const all: VercelDeployment[] = JSON.parse(raw);
    if (!chatId) return all;
    return all.filter(d =>!d.chatId || d.chatId === chatId);
  } catch { return []; }
}

export const getDeployments = getDeploymentHistory;

export function saveDeployment(chatId: string, dep: VercelDeployment) {
  if (!isBrowser()) return;
  try {
    const withChat = {...dep, chatId, createdAt: dep.createdAt || Date.now() };
    const raw = localStorage.getItem(VERCEL_HISTORY_KEY) || "[]";
    const all: VercelDeployment[] = JSON.parse(raw);
    // dedupe by id
    const filtered = all.filter(d => d.id!== dep.id);
    const next = [withChat,...filtered].slice(0, 50);
    localStorage.setItem(VERCEL_HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("nca-vercel-deployed"));
  } catch {}
}

// legacy overload: saveDeployment(dep) without chatId (kept for compat)
export function saveDeploymentLegacy(dep: any) {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(VERCEL_HISTORY_KEY) || "[]";
    const all = JSON.parse(raw);
    localStorage.setItem(VERCEL_HISTORY_KEY, JSON.stringify([dep,...all].slice(0, 50)));
  } catch {}
}

// --- Helpers for URLs ---
export function deploymentUrl(d: any): string {
  const url = d?.url || "";
  if (!url) return "";
  return url.startsWith("http")? url : `https://${url}`;
}
export function deploymentLogsUrl(d: any): string {
  return d?.inspectorUrl || d?.url? (d.inspectorUrl?.startsWith("http")? d.inspectorUrl : deploymentUrl(d)) : `https://vercel.com/dashboard`;
}

// --- Core Vercel API ---
function headers() {
  const t = getVercelToken();
  if (!t) throw new Error("Connect Vercel first in Settings");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

export async function createVercelDeployment(opts: {
  projectName: string;
  repo?: string;
  ref?: string;
  environment?: string[];
  files?: { path: string; content: string }[];
}): Promise<any> {
  const h = headers();

  // Resolve repoId if deploying from GitHub (this fixes your Failed to fetch)
  let repoId: number | undefined;
  if (opts.repo) {
    if (isBrowser()) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(GITHUB_REPO_ID_KEY_PREFIX) && k.endsWith(`_${opts.repo}`));
      if (keys.length) {
        const v = localStorage.getItem(keys[0]!);
        if (v) repoId = Number(v);
      }
    }
  }

  let body: any;
  if (opts.repo) {
    body = {
      name: opts.projectName,
      gitSource: {
        type: "github",
        repo: opts.repo,
        ref: opts.ref || "main",
       ...(repoId? { repoId } : {}),
      },
      projectSettings: { framework: "nextjs" },
    };
  } else {
    const vercelFiles = (opts.files || []).map(f => ({
      file: f.path.replace(/^\//, ""),
      data: f.content,
    }));
    body = {
      name: opts.projectName,
      files: vercelFiles,
      projectSettings: { framework: "nextjs" },
    };
  }

  // env
  if (opts.environment?.length) {
    const env: any = {};
    for (const line of opts.environment) {
      const idx = line.indexOf("=");
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) env[k] = v;
      }
    }
    if (Object.keys(env).length) body.env = env;
  }

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: h as any,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Vercel deploy failed (${res.status})`);
  return data;
}

export async function getVercelDeployment(id: string): Promise<any> {
  const token = getVercelToken();
  if (!token) throw new Error("Missing Vercel token");
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
    headers: { Authorization: `Bearer ${token}` } as any,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Could not fetch deployment");
  return data;
}

// extra compat exports some files may use
export async function deployToVercel(o: { token: string; repo: string; projectName: string; repoId?: number }) {
  saveVercelToken(o.token);
  return createVercelDeployment({ projectName: o.projectName, repo: o.repo });
}
