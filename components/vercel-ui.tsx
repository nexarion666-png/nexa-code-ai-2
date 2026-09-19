"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Rocket, Settings2, Triangle, X } from "lucide-react";
import { Button } from "./ui";
import { getVercelToken, saveVercelToken, clearVercelToken, validateVercelToken, type VercelUser, getDeploymentHistory, type VercelDeployment } from "@/lib/vercel";
import { getLastGitHubPush } from "@/lib/vercel";
import { listGitHubRepos, type GitHubRepo } from "@/lib/github";
import { type VirtualFile } from "@/lib/fileStore";

export function VercelIntegrationPanel() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<VercelUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = getVercelToken();
    setToken(saved || "");
    if (saved) void check(saved);
  }, []);

  async function check(value = token) {
    setBusy(true); setMessage("");
    try { const current = await validateVercelToken(value); setUser(current); saveVercelToken(value); setMessage("Vercel Connected"); }
    catch (error) { setUser(null); setMessage(error instanceof Error ? error.message : "Could not validate Vercel token."); }
    finally { setBusy(false); }
  }

  function disconnect() { clearVercelToken(); setUser(null); setToken(""); setMessage("Vercel disconnected."); }

  return <div className="rounded-2xl border border-line bg-panel p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 font-medium"><Triangle size={17} fill="currentColor"/> Vercel Integration</div>
        <p className="mt-1 text-xs text-muted">Use your own Vercel Access Token. NCA never stores it on the server.</p>
      </div>
      {user && <span className="flex items-center gap-1 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Vercel Connected</span>}
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste Vercel Access Token" className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm outline-none focus:border-violet-500/60" />
      <Button variant="primary" disabled={!token.trim() || busy} onClick={() => void check()}>{busy ? <Loader2 size={16} className="mr-2 animate-spin"/> : <Rocket size={16} className="mr-2"/>}{user ? "Validate" : "Connect Vercel"}</Button>
      {user && <Button variant="outline" onClick={disconnect}>Disconnect</Button>}
    </div>
    {message && <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${user ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-line bg-panel2 text-slate-300"}`}>{message}</div>}
    <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200">Get a Vercel Access Token <ExternalLink size={12}/></a>
  </div>;
}

export function DeploymentHistory({ chatId }: { chatId: string }) {
  const [history, setHistory] = useState<VercelDeployment[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setHistory(getDeploymentHistory(chatId));
    refresh();
    window.addEventListener("nca-vercel-deployed", refresh);
    return () => window.removeEventListener("nca-vercel-deployed", refresh);
  }, [chatId]);
  return <div className="flex h-full min-h-0 flex-col bg-[#07111e] p-4 md:p-6">
    <div className="mb-5"><div className="flex items-center gap-2 text-lg font-semibold"><Rocket size={19} className="text-violet-300"/> Deployment History</div><p className="mt-1 text-xs text-muted">Deployments created from this chat.</p></div>
    {!history.length ? <div className="grid flex-1 place-items-center text-center text-sm text-muted"><div><Rocket size={30} className="mx-auto mb-3 opacity-50"/><p>No deployments yet.</p><p className="mt-1 text-xs">Connect Vercel and deploy a project from the Code tab.</p></div></div> : <div className="min-h-0 space-y-3 overflow-y-auto">{history.map(item => <div key={item.id} className="rounded-2xl border border-line bg-panel p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-medium">{item.projectName || item.name}</div><div className="mt-1 text-[11px] text-muted">{new Date(item.createdAt).toLocaleString()} · {item.mode === "direct" ? "Direct upload" : item.repo}</div></div><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-300">{item.state}</span></div><div className="mt-3 flex flex-wrap gap-2"><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"><ExternalLink size={13}/> Visit Live</a>{item.repo && <a href={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><ExternalLink size={13}/> GitHub Repo</a>}{item.inspectorUrl && <a href={item.inspectorUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Settings2 size={13}/> View Logs</a>}</div></div>)}</div>}
  </div>;
}

export function DeployModal({ chatId, files, onClose, onDeployed }: { chatId: string; files: VirtualFile[]; onClose: () => void; onDeployed: () => void }) {
  const [mode, setMode] = useState<"github" | "direct">("github");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repo, setRepo] = useState("");
  const [projectName, setProjectName] = useState("");
  const [envText, setEnvText] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "deploying" | "done">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ url: string; logs: string } | null>(null);
  const lastPush = typeof window !== "undefined" ? getLastGitHubPush(chatId) : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode !== "github") return;
    void listGitHubRepos().then(list => { setRepos(list); const preferred = lastPush?.repo || list[0]?.full_name || ""; setRepo(preferred); if (!projectName && preferred) setProjectName(preferred.split("/")[1]); }).catch(error => setMessage(error instanceof Error ? error.message : "Could not load GitHub repositories."));
  }, [mode, chatId]);

  async function deploy() {
    if (mode === "github" && !lastPush) { setMessage("Push to GitHub first before deploying from GitHub."); return; }
    if (!projectName.trim()) { setMessage("Enter a project name."); return; }
    if (mode === "github" && !repo) { setMessage("Select a GitHub repository."); return; }
    if (mode === "direct" && !files.length) { setMessage("There are no project files to deploy."); return; }
    setMessage(""); setResult(null); setStatus("building");
    try {
      const { createVercelDeployment, getVercelDeployment, deploymentUrl, deploymentLogsUrl, saveDeployment } = await import("@/lib/vercel");
      const environment = envText.split("\n").map(line => line.trim()).filter(Boolean);
      const response = await createVercelDeployment({ projectName: projectName.trim(), repo: mode === "github" ? repo : undefined, ref: "main", environment, files: mode === "direct" ? files : undefined });
      setStatus("deploying");
      let current = response as { id: string; url?: string; inspectorUrl?: string; readyState?: string; name?: string };
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        current = await getVercelDeployment(response.id);
        if (["READY", "ERROR", "CANCELED"].includes(String(current.readyState || "").toUpperCase())) break;
      }
      if (String(current.readyState).toUpperCase() !== "READY") throw new Error(`Deployment finished with state ${current.readyState || "UNKNOWN"}. Open View Logs for details.`);
      const url = deploymentUrl(current);
      const logs = deploymentLogsUrl(current);
      saveDeployment(chatId, { id: current.id, name: current.name || projectName, url, inspectorUrl: (current.inspectorUrl || url) as string, state: current.readyState, createdAt: Date.now(), repo: mode === "github" ? repo : undefined, projectName, mode } as any);
      setStatus("done"); setResult({ url, logs }); onDeployed();
    } catch (error) { setStatus("idle"); setMessage(error instanceof Error ? error.message : "Deployment failed."); }
  }

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-line bg-[#0a1422] p-5 shadow-2xl md:p-6">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-lg font-semibold"><Triangle size={19} fill="currentColor"/> Deploy to Vercel</div><p className="mt-1 text-xs text-muted">Next.js is selected as the framework preset.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-white/5"><X size={18}/></button></div>
      {!result && <>
        <div className="mt-5 flex rounded-xl border border-line bg-panel2 p-1"><button onClick={() => setMode("github")} className={`flex-1 rounded-lg px-3 py-2 text-xs ${mode === "github" ? "bg-white/10 text-white" : "text-muted"}`}>GitHub repo</button><button onClick={() => setMode("direct")} className={`flex-1 rounded-lg px-3 py-2 text-xs ${mode === "direct" ? "bg-white/10 text-white" : "text-muted"}`}>Direct upload</button></div>
        {mode === "github" && <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-100">{lastPush ? <>Last pushed repo: <strong>{lastPush.repo}</strong></> : <>Push to GitHub first. The Deploy button only uses a repository that NCA has recorded as pushed from this chat.</>}</div>}
        {mode === "github" && <label className="mt-4 block text-xs text-muted">GitHub repository<select value={repo} onChange={e => setRepo(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-sm text-white outline-none">{repos.map(item => <option key={item.id} value={item.full_name}>{item.full_name}</option>)}</select></label>}
        <label className="mt-4 block text-xs text-muted">Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="my-nexa-app" className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60"/></label>
        <div className="mt-4 rounded-xl border border-line bg-panel2 p-3"><div className="text-xs font-medium text-white">Framework Preset</div><div className="mt-1 text-xs text-muted">Next.js · auto-detect</div></div>
        <label className="mt-4 block text-xs text-muted">Environment variables <span className="opacity-60">(optional, one KEY=value per line)</span><textarea value={envText} onChange={e => setEnvText(e.target.value)} rows={4} placeholder="NEXT_PUBLIC_API_URL=https://example.com" className="mt-2 w-full resize-none rounded-xl border border-line bg-panel2 px-4 py-3 font-mono text-xs text-white outline-none focus:border-violet-500/60"/></label>
        {mode === "direct" && <div className="mt-3 text-xs text-muted">Direct upload sends {files.length} virtual files to Vercel. Your generated project must contain the files needed for a valid Next.js build.</div>}
        {message && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">{message}</div>}
        <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={status !== "idle"} onClick={() => void deploy()}>{status === "building" ? <><Loader2 size={16} className="mr-2 animate-spin"/>Building…</> : status === "deploying" ? <><Loader2 size={16} className="mr-2 animate-spin"/>Deploying…</> : <><Rocket size={16} className="mr-2"/>Deploy</>}</Button></div>
      </>}
      {result && <div className="relative py-8 text-center overflow-hidden"><div className="pointer-events-none absolute inset-0">{Array.from({ length: 18 }, (_, index) => <span key={index} className="absolute h-2 w-2 animate-bounce rounded-sm bg-violet-400" style={{ left: `${(index * 37) % 100}%`, top: `${(index * 19) % 70}%`, animationDelay: `${index * 35}ms`, transform: `rotate(${index * 20}deg)` }} />)}</div><div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-300"><CheckCircle2 size={34}/></div><h2 className="mt-4 text-2xl font-semibold">Deployment Live</h2><p className="mt-2 text-sm text-muted">Your project is now available on Vercel.</p><a href={result.url} target="_blank" rel="noreferrer" className="mx-auto mt-5 block max-w-full truncate text-sm text-violet-300 hover:text-violet-200">{result.url}</a><div className="mt-6 flex flex-wrap justify-center gap-2"><a href={result.url} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Visit Live</a><a href={result.logs} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2 text-sm text-slate-300 hover:bg-white/5">View Logs</a><Button variant="outline" onClick={onClose}>Done</Button></div></div>}
    </div>
  </div>;
}
