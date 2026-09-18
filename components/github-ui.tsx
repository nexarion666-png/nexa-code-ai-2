"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Github, Loader2, LogOut, Plus, RefreshCw, X } from "lucide-react";
import { beginGitHubOAuth, clearGitHubConnection, createGitHubRepo, getCachedGitHubUser, getGitHubUser, listGitHubRepos, type GitHubRepo, type GitHubUser } from "@/lib/github";
import { Button } from "./ui";

export function GitHubStatusButton() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const cached = getCachedGitHubUser();
    if (cached) setUser(cached);
    void (async () => {
      try {
        const current = await getGitHubUser();
        if (mounted) setUser(current);
      } catch {
        // Not connected or token is no longer valid.
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function connect() {
    try { beginGitHubOAuth(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "GitHub OAuth is not configured."); }
  }

  async function refresh() {
    setBusy(true);
    try { setUser(await getGitHubUser()); }
    catch { clearGitHubConnection(); setUser(null); }
    finally { setBusy(false); }
  }

  function disconnect() {
    clearGitHubConnection();
    setUser(null);
  }

  if (!user) return <><Button onClick={() => void connect()} className="h-11 w-11 border border-line bg-panel2 p-0 text-slate-200 sm:hidden" aria-label="Connect GitHub"><Github size={18}/></Button><Button onClick={() => void connect()} className="hidden gap-2 border border-line bg-panel2 text-slate-200 sm:inline-flex"><Github size={17}/> Connect GitHub</Button></>;
  return <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-2 py-2 sm:px-3">
    <span className="h-2 w-2 rounded-full bg-emerald-400" />
    <span className="hidden max-w-[130px] truncate text-xs text-emerald-200 sm:inline">GitHub Connected: {user.login}</span><span className="inline text-xs text-emerald-200 sm:hidden">{user.login.slice(0, 12)}</span>
    <button onClick={() => void refresh()} className="rounded-md p-1 text-emerald-200/70 hover:bg-white/5" title="Refresh GitHub connection"><RefreshCw size={13} className={busy ? "animate-spin" : ""}/></button>
    <button onClick={disconnect} className="rounded-md p-1 text-emerald-200/70 hover:bg-red-500/10 hover:text-red-200" title="Disconnect GitHub"><LogOut size={13}/></button>
  </div>;
}

export function GitHubActionsPanel() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repoName, setRepoName] = useState("");
  const [privateRepo, setPrivateRepo] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdRepo, setCreatedRepo] = useState<GitHubRepo | null>(null);

  async function refresh() {
    setBusy(true); setMessage("");
    try {
      const current = await getGitHubUser();
      setUser(current);
      setRepos(await listGitHubRepos());
    } catch (error) {
      setUser(null);
      setMessage(error instanceof Error ? error.message : "Connect GitHub to manage repositories.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function connect() {
    try { beginGitHubOAuth(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "GitHub OAuth is not configured."); }
  }

  async function createRepo() {
    setBusy(true); setMessage("");
    try {
      const repo = await createGitHubRepo(repoName, privateRepo);
      setRepos((current) => [repo, ...current.filter((item) => item.id !== repo.id)]);
      setCreateOpen(false);
      setRepoName("");
      setCreatedRepo(repo);
      setMessage(`Created ${repo.full_name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create repository.");
    } finally { setBusy(false); }
  }

  return <div className="rounded-2xl border border-line bg-panel p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 font-medium"><Github size={18} className="text-slate-200"/> GitHub Actions</div>
        <p className="mt-1 text-xs text-muted">Connect your GitHub account and create repositories for projects built by NCA.</p>
      </div>
      {user ? <div className="flex items-center gap-2 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/> {user.login}</div> : <Button variant="outline" onClick={() => void connect()}><Github size={15} className="mr-2"/> Connect GitHub</Button>}
    </div>
    {user && <div className="mt-5 flex flex-wrap gap-3">
      <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2"/> Create New Repo</Button>
      <Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`}/> Refresh repos</Button>
    </div>}
    {message && <div className="mt-4 rounded-xl border border-line bg-panel2 px-3 py-2 text-xs text-slate-300">{message}{createdRepo && <a href={createdRepo.html_url} target="_blank" rel="noreferrer" className="ml-2 text-violet-300 underline underline-offset-2">Open repository</a>}</div>}
    {user && repos.length > 0 && <div className="mt-5 border-t border-line pt-4"><div className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted">Your repositories</div><div className="max-h-56 space-y-1 overflow-auto">{repos.slice(0, 20).map(repo => <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><span>{repo.full_name}</span><span className="text-[10px] text-muted">{repo.private ? "Private" : "Public"}</span></a>)}</div></div>}
    {createOpen && <CreateRepoModal name={repoName} setName={setRepoName} isPrivate={privateRepo} setPrivate={setPrivateRepo} busy={busy} onClose={() => setCreateOpen(false)} onCreate={() => void createRepo()}/>} 
  </div>;
}

export function CreateRepoModal({ name, setName, isPrivate, setPrivate, busy, onClose, onCreate }: { name: string; setName: (v: string) => void; isPrivate: boolean; setPrivate: (v: boolean) => void; busy: boolean; onClose: () => void; onCreate: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1422] p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Create New Repo</h2><p className="mt-1 text-xs text-muted">A starter commit is added so NCA can push files immediately.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-white/5"><X size={18}/></button></div>
      <label className="text-xs text-muted">Repository name<input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && name.trim()) onCreate(); }} placeholder="my-nexa-project" className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-sm outline-none focus:border-violet-500/60"/></label>
      <div className="mt-4 flex rounded-xl border border-line bg-panel2 p-1"><button onClick={() => setPrivate(true)} className={`flex-1 rounded-lg px-3 py-2 text-sm ${isPrivate ? "bg-white/10 text-white" : "text-muted"}`}>Private</button><button onClick={() => setPrivate(false)} className={`flex-1 rounded-lg px-3 py-2 text-sm ${!isPrivate ? "bg-white/10 text-white" : "text-muted"}`}>Public</button></div>
      <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || busy} onClick={onCreate}>{busy ? <Loader2 size={16} className="mr-2 animate-spin"/> : <Plus size={16} className="mr-2"/>}Create Repo</Button></div>
    </div>
  </div>;
}

export function GitHubConnectHint() {
  return <div className="flex items-center gap-2 text-xs text-muted"><CheckCircle2 size={14} className="text-emerald-300"/> GitHub integration uses your OAuth access token stored in this browser.</div>;
}
