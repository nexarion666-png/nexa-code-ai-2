const TOKEN_KEY = "vercel_token";
const LAST_PUSH_KEY = "last_github_push";
const DEPLOYMENTS_KEY = "vercel_deployments";
const LAST_REPO_KEY = "last_github_repo";

export function getVercelToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function saveVercelToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function getLastGitHubPush(chatId: string): any {
  try { return JSON.parse(localStorage.getItem(`${LAST_PUSH_KEY}_${chatId}`) || "null"); } catch { return null; }
}
export function saveLastGitHubPush(chatId: string, data: any) {
  localStorage.setItem(`${LAST_PUSH_KEY}_${chatId}`, JSON.stringify(data));
  if (data?.repo || data?.fullName) {
    localStorage.setItem(LAST_REPO_KEY, data.repo || data.fullName);
  }
}
export const markGitHubPush = saveLastGitHubPush;
export function getLastGitHubRepo(chatId: string) {
  const d = getLastGitHubPush(chatId);
  return d?.repo || d?.fullName || localStorage.getItem(LAST_REPO_KEY) || "";
}
export function saveDeployment(d: any) {
  try {
    const all = JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || "[]");
    all.unshift(d);
    localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(all.slice(0,20)));
  } catch {}
}
export function getDeployments(): any[] {
  try { return JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || "[]"); } catch { return []; }
}

export async function deployToVercel(opts: { token: string; repo: string; projectName: string; repoId?: number }) {
  let repoId: number | null = opts.repoId || null;
  if (!repoId) {
    try {
      const saved = localStorage.getItem(`github_repo_id_${opts.repo}`);
      if (saved) repoId = parseInt(saved);
      if (!repoId) {
        const last = localStorage.getItem(LAST_REPO_KEY);
        if (last && last === opts.repo) {
          const saved2 = localStorage.getItem(`github_repo_id_${last}`);
          if (saved2) repoId = parseInt(saved2);
        }
      }
    } catch {}
  }
  if (!repoId) {
    try {
      const ghToken = localStorage.getItem("github_token") || localStorage.getItem("gh_token") || localStorage.getItem("github_oauth_token") || "";
      if (ghToken && opts.repo) {
        const r = await fetch(`https://api.github.com/repos/${opts.repo}`, { headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" } });
        const d = await r.json();
        if (d?.id) {
          repoId = d.id;
          localStorage.setItem(`github_repo_id_${opts.repo}`, String(d.id));
        }
      }
    } catch {}
  }
  if (!repoId) throw new Error(`repoId missing for ${opts.repo}. Open GitHub panel and Refresh repos, then push again.`);
  
  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      gitSource: { type: "github", repoId: repoId, ref: "main", repo: opts.repo },
      project: opts.projectName
    }),
  });
  const dep = await res.json();
  if (!res.ok) throw new Error(dep?.error?.message || JSON.stringify(dep));
  saveDeployment(dep);
  return dep;
}
