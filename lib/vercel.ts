const TOKEN_KEY = "vercel_token";
const LAST_PUSH_KEY = "last_github_push";
const DEPLOYMENTS_KEY = "vercel_deployments";
const LAST_REPO_KEY = "last_github_repo";

function isBrowser() { return typeof window !== "undefined"; }

export type VercelUser = { id: string; username: string; email?: string; };
export type VercelDeployment = { id: string; url: string; name?: string; state?: string; createdAt?: number; source?: string; };

export function getVercelToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function saveVercelToken(token: string) {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearVercelToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
}
export async function validateVercelToken(token = getVercelToken()): Promise<VercelUser> {
  if (!isBrowser()) throw new Error("Vercel is available in the browser only.");
  if (!token) throw new Error("Paste a Vercel Access Token first.");
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Invalid token");
  return data?.user || data;
}

export function getLastGitHubPush(chatId: string): any {
  if (!isBrowser()) return null;
  try { return JSON.parse(localStorage.getItem(`${LAST_PUSH_KEY}_${chatId}`) || "null"); } catch { return null; }
}
export function saveLastGitHubPush(chatId: string, data: any) {
  if (!isBrowser()) return;
  localStorage.setItem(`${LAST_PUSH_KEY}_${chatId}`, JSON.stringify(data));
  if (data?.repo || data?.fullName) {
    localStorage.setItem(LAST_REPO_KEY, data.repo || data.fullName);
  }
}
export const markGitHubPush = saveLastGitHubPush;
export function getLastGitHubRepo(chatId: string) {
  const d = getLastGitHubPush(chatId);
  return d?.repo || d?.fullName || (isBrowser() ? localStorage.getItem(LAST_REPO_KEY) || "" : "");
}

export function saveDeployment(d: any) {
  if (!isBrowser()) return;
  try {
    const all = JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || "[]");
    all.unshift(d);
    localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(all.slice(0,20)));
  } catch {}
}
export function getDeploymentHistory(_chatId?: string): VercelDeployment[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || "[]"); } catch { return []; }
}
export const getDeployments = (chatId?: string) => getDeploymentHistory(chatId);

export async function deployToVercel(opts: { token: string; repo: string; projectName: string; repoId?: number }) {
  let repoId: number | null = opts.repoId || null;

  if (!repoId && isBrowser()) {
    try {
      const cached = localStorage.getItem(`github_repo_id_${opts.repo}`);
      if (cached) repoId = parseInt(cached);
    } catch {}
    if (!repoId) {
      try {
        const ghToken = localStorage.getItem("github_token") || localStorage.getItem("gh_token") || "";
        if (ghToken && opts.repo) {
          const r = await fetch(`https://api.github.com/repos/${opts.repo}`, {
            headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" },
          });
          if (r.ok) {
            const d = await r.json();
            if (d?.id) {
              repoId = d.id;
              localStorage.setItem(`github_repo_id_${opts.repo}`, String(d.id));
            }
          }
        }
      } catch {}
    }
  }

  if (!repoId) throw new Error(`repoId missing for ${opts.repo}. Push to GitHub again to cache it, then retry Deploy.`);

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      gitSource: { type: "github", repoId: repoId, ref: "main", repo: opts.repo },
      project: opts.projectName,
    }),
  });
  const dep = await res.json();
  if (!res.ok) throw new Error(dep?.error?.message || JSON.stringify(dep));
  saveDeployment(dep);
  return dep;
}
