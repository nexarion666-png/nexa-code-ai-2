"use client";
export const GITHUB_TOKEN_KEY = "github_token";
export const GITHUB_USER_KEY = "github_user";
export const GITHUB_STATE_KEY = "github_oauth_state";
export type GitHubUser = { login: string; avatar_url?: string; html_url?: string };
export type GitHubRepo = { id: number; name: string; full_name: string; private: boolean; html_url: string; default_branch: string };

function saveRepoIdCache(fullName: string, id: number) {
  try {
    if (typeof window !== "undefined" && fullName && id) {
      localStorage.setItem(`github_repo_id_${fullName}`, String(id));
      localStorage.setItem("last_github_repo", fullName);
    }
  } catch {}
}

function isBrowser() { return typeof window !== "undefined"; }
export function getGitHubToken() { if (!isBrowser()) return ""; return localStorage.getItem(GITHUB_TOKEN_KEY) || ""; }
export function saveGitHubToken(token: string) { if (!isBrowser()) return; localStorage.setItem(GITHUB_TOKEN_KEY, token); }
export function clearGitHubConnection() { if (!isBrowser()) return; localStorage.removeItem(GITHUB_TOKEN_KEY); localStorage.removeItem(GITHUB_USER_KEY); }
export function getCachedGitHubUser(): GitHubUser | null { if (!isBrowser()) return null; try { const value = localStorage.getItem(GITHUB_USER_KEY); return value ? JSON.parse(value) as GitHubUser : null; } catch { return null; } }
function cacheUser(user: GitHubUser) { if (!isBrowser()) return; localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user)); }
export function beginGitHubOAuth() { if (!isBrowser()) return; const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID; if (!clientId) throw new Error("GitHub OAuth is not configured."); const state = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; localStorage.setItem(GITHUB_STATE_KEY, state); const redirectUri = `https://nexa-code-ai-2.vercel.app/github/callback`; const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: "repo user", state, }); window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`); }
export function getSavedOAuthState() { if (!isBrowser()) return ""; return localStorage.getItem(GITHUB_STATE_KEY) || ""; }
export function clearOAuthState() { if (!isBrowser()) return; localStorage.removeItem(GITHUB_STATE_KEY); }
async function octokit() { const token = getGitHubToken(); if (!token) throw new Error("Connect GitHub first."); const { Octokit } = await import("@octokit/rest"); return new Octokit({ auth: token }); }
export async function getGitHubUser() { const client = await octokit(); const { data } = await client.rest.users.getAuthenticated(); const user: GitHubUser = { login: data.login, avatar_url: data.avatar_url, html_url: data.html_url }; cacheUser(user); return user; }
export async function listGitHubRepos() { const client = await octokit(); const { data } = await client.rest.repos.listForAuthenticatedUser({ visibility: "all", affiliation: "owner,collaborator,organization_member", per_page: 100, sort: "updated", }); 
  try { for (const r of data as any[]) { if (r?.full_name && r?.id) saveRepoIdCache(r.full_name, r.id); } } catch {}
  return data as GitHubRepo[]; }
export async function createGitHubRepo(name: string, isPrivate: boolean) { const cleanName = name.trim(); if (!cleanName) throw new Error("Repository name is required."); const client = await octokit(); const { data } = await client.rest.repos.createForAuthenticatedUser({ name: cleanName, private: isPrivate, auto_init: true, }); return data as GitHubRepo; }
function utf8ToBase64(value: string) { const bytes = new TextEncoder().encode(value); let binary = ""; const chunkSize = 0x8000; for (let i = 0; i < bytes.length; i += chunkSize) { binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[]); } return btoa(binary); }
export async function pushFilesToGitHub(repo: GitHubRepo, files: Array<{ path: string; content: string }>) { if (!files.length) throw new Error("There are no files to push."); const client = await octokit(); let branch = repo.default_branch || "main"; if (!repo.default_branch) { try { const { data } = await client.rest.repos.get({ owner: repo.full_name.split("/")[0], repo: repo.name }); branch = data.default_branch || "main"; } catch { branch = "main"; } } let pushed = 0; for (const file of files) { const cleanPath = file.path.replace(/^\/+/, "").trim(); if (!cleanPath) continue; const owner = repo.full_name.split("/")[0]; let sha: string | undefined; try { const existing = await client.rest.repos.getContent({ owner, repo: repo.name, path: cleanPath, ref: branch }); if (!Array.isArray(existing.data) && (existing.data as any).type === "file") sha = (existing.data as any).sha; } catch (err: any) { const status = err?.status; if (status && status !== 404) console.warn("check failed", err?.message); } await client.rest.repos.createOrUpdateFileContents({ owner, repo: repo.name, path: cleanPath, message: `${sha ? "Update" : "Create"} ${cleanPath} via Nexa`, content: utf8ToBase64(file.content), branch, ...(sha ? { sha } : {}), }); pushed += 1; } return pushed; }
