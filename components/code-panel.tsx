"use client";

import { Download, FileCode2, Maximize2, Eye, Code2, CheckCircle2, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./monaco-editor";
import { FileChange, VirtualFile } from "@/lib/fileStore";
import { beginGitHubOAuth, getGitHubToken, listGitHubRepos, pushFilesToGitHub, type GitHubRepo } from "@/lib/github";
import { CreateRepoModal } from "./github-ui";
import { Button } from "./ui";
import { DeployModal } from "./vercel-ui";
import { getVercelToken, getLastGitHubPush, markGitHubPush } from "@/lib/vercel";

const starter: VirtualFile = {
  path: "app/api/nexa-code-ai/route.ts",
  content: `import { NextResponse } from "next/server";\n\nexport async function GET() {\n  return NextResponse.json({\n    message: "Nexa Code AI is ready",\n  });\n}\n`,
  createdAt: new Date(0).toISOString(),
};

function languageFor(path: string) {
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".html")) return "html";
  return "plaintext";
}

export function CodePanel({ chatId, files, activePath, onOpen, changes, nextSteps, onNextStep }: {
  chatId: string;
  files: VirtualFile[];
  activePath: string | null;
  onOpen: (path: string) => void;
  changes: FileChange[];
  nextSteps: string[];
  onNextStep: (step: string) => void;
}) {
  const [view, setView] = useState<"code" | "preview">("code");
  const [downloading, setDownloading] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [createRepoOpen, setCreateRepoOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const current = useMemo(() => files.find((file) => file.path === activePath) || files[0] || starter, [files, activePath]);
  const visibleFiles = files.length ? files : [starter];

  async function openPush() {
    setPushMessage("");
    if (!getGitHubToken()) {
      try { beginGitHubOAuth(); } catch (error) { setPushMessage(error instanceof Error ? error.message : "Connect GitHub first."); }
      return;
    }
    setPushOpen(true);
    try {
      const list = await listGitHubRepos();
      setRepos(list);
      if (list.length && !selectedRepo) setSelectedRepo(String(list[0].id));
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "Could not load GitHub repositories."); }
  }

  async function pushSelected() {
    const repo = repos.find((item) => String(item.id) === selectedRepo);
    if (!repo) { setPushMessage("Select a repository first."); return; }
    setPushing(true); setPushMessage("");
    try {
      const count = await pushFilesToGitHub(repo, files);
      markGitHubPush(chatId, repo.full_name);
      setPushMessage(`Pushed ${count} files to ${repo.full_name}`);
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "Push failed."); }
    finally { setPushing(false); }
  }

  async function createAndUseRepo() {
    if (!newRepoName.trim()) return;
    setPushing(true); setPushMessage("");
    try {
      const { createGitHubRepo } = await import("@/lib/github");
      const repo = await createGitHubRepo(newRepoName, newRepoPrivate);
      setRepos((current) => [repo, ...current]);
      setSelectedRepo(String(repo.id));
      setCreateRepoOpen(false);
      setNewRepoName("");
      setPushMessage(`Created ${repo.full_name}. Ready to push.`);
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "Could not create repository."); }
    finally { setPushing(false); }
  }

  function openDeploy() {
    if (!getVercelToken()) {
      setPushMessage("Connect Vercel in Settings first.");
      return;
    }
    setDeployOpen(true);
  }

  async function downloadZip() {
    if (downloading) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const file of files) {
        if (file.isImage && (file.size || file.content.length * 0.75) > 2 * 1024 * 1024) continue;
        if (file.isImage && file.content.startsWith("data:")) {
          const comma = file.content.indexOf(",");
          if (comma > -1) zip.file(file.path, file.content.slice(comma + 1), { base64: true });
        } else zip.file(file.path, file.content);
      }
      if (!files.length) zip.file(starter.path, starter.content);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nexacode-${chatId || "project"}.zip`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-line px-3">
        <div className="flex items-center rounded-xl bg-panel2 p-1">
          <button onClick={() => setView("code")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${view === "code" ? "bg-white/10 text-white" : "text-muted"}`}><Code2 size={15}/>Code</button>
          <button onClick={() => setView("preview")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${view === "preview" ? "bg-white/10 text-white" : "text-muted"}`}><Eye size={15}/>Preview</button>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max items-center gap-1">
            {visibleFiles.map((file) => (
              <button key={file.path} onClick={() => onOpen(file.path)} className={`flex max-w-[220px] items-center gap-2 rounded-t-xl border border-b-0 border-line px-3 py-2.5 text-xs ${file.path === current.path ? "bg-[#07111e] text-white" : "bg-panel2 text-muted hover:text-white"}`}>
                <FileCode2 size={14} className="shrink-0 text-blue-300"/><span className="truncate">{file.path.split("/").pop()}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={downloadZip} disabled={downloading} className="ml-auto flex shrink-0 items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-black hover:bg-slate-200 disabled:opacity-60 sm:px-3" title="Download project ZIP">
          <Download size={15}/><span className="hidden sm:inline">{downloading ? "Zipping…" : "Download"}</span>
        </button>
        <button onClick={() => void openPush()} disabled={pushing} className="flex shrink-0 items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 disabled:opacity-60 sm:px-3" title="Push files to GitHub">
          <span className="text-base leading-none">↥</span><span className="hidden sm:inline">Push to GitHub</span>
        </button>
        <button onClick={openDeploy} className="flex shrink-0 items-center gap-2 rounded-lg bg-black px-2.5 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-slate-900 sm:px-3" title="Deploy to Vercel">
          <span className="inline-flex h-4 w-4 items-center justify-center"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true"><path d="M12 2 23 21H1L12 2Z"/></svg></span><span className="hidden sm:inline">Deploy to Vercel</span>
        </button>
        <button className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-ink" title="Maximize"><Maximize2 size={16}/></button>
      </div>

      <div className="min-h-0 flex-1">
        {view === "code" ? <CodeEditor value={current.content} language={languageFor(current.path)} /> : <Preview file={current} />}
      </div>

      {pushOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1422] p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Push to GitHub</h2><p className="mt-1 text-xs text-muted">Push all {files.length} files from this chat.</p></div><button onClick={() => setPushOpen(false)} className="rounded-lg p-2 text-muted hover:bg-white/5">×</button></div>
          {repos.length ? <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} className="w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-sm outline-none">{repos.map(repo => <option key={repo.id} value={repo.id}>{repo.full_name} {repo.private ? "(Private)" : "(Public)"}</option>)}</select> : <div className="rounded-xl border border-line bg-panel2 p-4 text-sm text-muted">No repositories found.</div>}
          {pushMessage && <div className="mt-3 rounded-xl border border-line bg-panel2 p-3 text-xs text-slate-300">{pushMessage}</div>}
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setCreateRepoOpen(true)} className="rounded-xl border border-line px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Create new repo</button><Button onClick={() => void pushSelected()} variant="primary" disabled={!selectedRepo || pushing || !files.length}>{pushing ? "Pushing…" : "Push files"}</Button></div>
        </div>
      </div>}
      {deployOpen && <DeployModal chatId={chatId} files={files} onClose={() => setDeployOpen(false)} onDeployed={() => {}} />}
      {createRepoOpen && <CreateRepoModal name={newRepoName} setName={setNewRepoName} isPrivate={newRepoPrivate} setPrivate={setNewRepoPrivate} busy={pushing} onClose={() => setCreateRepoOpen(false)} onCreate={() => void createAndUseRepo()}/>}

      <div className="max-h-[38%] shrink-0 overflow-y-auto border-t border-line bg-[#07111e] p-3">
        {changes.length > 0 && <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-300"><CheckCircle2 size={15}/>Changes Applied:</div>
          <div className="space-y-1 text-xs text-slate-300">{changes.map((change) => <div key={change.path}>• {change.action}: {change.path}</div>)}</div>
        </div>}
        {nextSteps.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200"><Lightbulb size={15}/>Next Steps:</div>
          <div className="flex flex-wrap gap-2">{nextSteps.map((step) => <button key={step} onClick={() => onNextStep(step)} className="rounded-lg border border-line bg-white/[.03] px-3 py-2 text-left text-xs text-slate-300 hover:border-violet-400/40 hover:text-white">{step}</button>)}</div>
        </div>}
      </div>
    </section>
  );
}

function Preview({ file }: { file: VirtualFile }) {
  const isHtml = /\.html?$/i.test(file.path);
  if (!isHtml) return <div className="grid h-full place-items-center p-8 text-center text-sm text-muted"><div><Eye className="mx-auto mb-3" size={28}/><p>Preview is available for HTML files.</p><p className="mt-1 text-xs">Open or create an HTML file to preview it here.</p></div></div>;
  return <iframe title="Nexa Code preview" className="h-full w-full border-0 bg-white" srcDoc={file.content} sandbox="allow-scripts" />;
}

