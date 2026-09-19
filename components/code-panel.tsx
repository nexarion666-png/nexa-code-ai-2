"use client";
import { Download, FileCode2, Maximize2, Eye, Code2, CheckCircle2, Lightbulb, Github, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./monaco-editor";
import { FileChange, VirtualFile } from "@/lib/fileStore";
import { beginGitHubOAuth, getGitHubToken, listGitHubRepos, pushFilesToGitHub, type GitHubRepo } from "@/lib/github";
import { CreateRepoModal } from "./github-ui";
import { Button } from "./ui";
import { DeployModal } from "./vercel-ui";
import { getVercelToken, markGitHubPush } from "@/lib/vercel";
const starter: VirtualFile = { path: "app/api/nexa-code-ai/route.ts", content: `import { NextResponse } from "next/server";\nexport async function GET() { return NextResponse.json({ message: "Nexa Code AI is ready" }); }`, createdAt: new Date(0).toISOString(), };
function languageFor(path: string) { if (path.endsWith(".tsx")) return "typescript"; if (path.endsWith(".ts")) return "typescript"; if (path.endsWith(".js")) return "javascript"; if (path.endsWith(".css")) return "css"; if (path.endsWith(".json")) return "json"; if (path.endsWith(".html")) return "html"; return "plaintext"; }
export function CodePanel({ chatId, files, activePath, onOpen, changes, nextSteps, onNextStep }: { chatId: string; files: VirtualFile[]; activePath: string | null; onOpen: (path: string) => void; changes: FileChange[]; nextSteps: string[]; onNextStep: (step: string) => void; }) {
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
  const visibleFiles = files.length? files : [starter];
  async function openPush() {
    setPushMessage("");
    if (!getGitHubToken()) { try { beginGitHubOAuth(); } catch (e) { setPushMessage(e instanceof Error? e.message : "Connect GitHub first."); } return; }
    setPushOpen(true);
    try { const list = await listGitHubRepos(); setRepos(list); if (list.length &&!selectedRepo) setSelectedRepo(String(list[0].id)); } catch (e) { setPushMessage(e instanceof Error? e.message : "Could not load repos."); }
  }
  async function pushSelected() {
    const repo = repos.find((item) => String(item.id) === selectedRepo);
    if (!repo) { setPushMessage("Select a repository first."); return; }
    setPushing(true); setPushMessage("");
    try { const count = await pushFilesToGitHub(repo, files); markGitHubPush(chatId, repo.full_name); setPushMessage(`Pushed ${count} files to ${repo.full_name}`); } catch (e) { setPushMessage(e instanceof Error? e.message : "Push failed."); } finally { setPushing(false); }
  }
  async function createAndUseRepo() {
    if (!newRepoName.trim()) return;
    setPushing(true); setPushMessage("");
    try { const { createGitHubRepo } = await import("@/lib/github"); const repo = await createGitHubRepo(newRepoName, newRepoPrivate); setRepos((c) => [repo,...c]); setSelectedRepo(String(repo.id)); setCreateRepoOpen(false); setNewRepoName(""); setPushMessage(`Created ${repo.full_name}. Ready to push.`); } catch (e) { setPushMessage(e instanceof Error? e.message : "Could not create repository."); } finally { setPushing(false); }
  }
  function openDeploy() { if (!getVercelToken()) { setPushMessage("Connect Vercel in Settings first."); return; } setDeployOpen(true); }
  async function downloadZip() {
    if (downloading) return; setDownloading(true);
    try { const JSZip = (await import("jszip")).default; const zip = new JSZip(); for (const file of files) { if (file.isImage && (file.size || file.content.length * 0.75) > 2 * 1024 * 1024) continue; if (file.isImage && file.content.startsWith("data:")) { const comma = file.content.indexOf(","); if (comma > -1) zip.file(file.path, file.content.slice(comma + 1), { base64: true }); } else zip.file(file.path, file.content); } if (!files.length) zip.file(starter.path, starter.content); const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nexacode-${chatId || "project"}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } finally { setDownloading(false); }
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      {/* MOBILE FIXED TOOLBAR */}
      <div className="flex flex-col border-b border-line bg-[#07111e]">
        {/* Row 1: Code / Preview */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center rounded-xl bg-panel2 p-1">
            <button onClick={() => setView("code")} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${view === "code"? "bg-white/10 text-white" : "text-muted"}`}><Code2 size={14}/>Code</button>
            <button onClick={() => setView("preview")} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${view === "preview"? "bg-white/10 text-white" : "text-muted"}`}><Eye size={14}/>Preview</button>
          </div>
        </div>
        {/* Row 2: ACTION BUTTONS - ALWAYS VISIBLE ON MOBILE */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-line/50 bg-[#0d1d31]">
          <button onClick={downloadZip} disabled={downloading} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"><Download size={14}/>{downloading? "..." : "Download"}</button>
          <button onClick={() => void openPush()} disabled={pushing} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg"><Github size={14}/>Push to GitHub</button>
          <button onClick={openDeploy} className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20"><Rocket size={14}/>Deploy</button>
        </div>
        {/* Row 3: File tabs - scrollable */}
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto border-t border-line/30 scrollbar-thin">
          {visibleFiles.map((file) => (
            <button key={file.path} onClick={() => onOpen(file.path)} className={`flex max-w-[130px] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${file.path === current.path? "bg-[#0a1422] text-white border-violet-500/50" : "bg-panel2 text-muted border-line"}`}><FileCode2 size={12} className="shrink-0 text-blue-300"/><span className="truncate">{file.path.split("/").pop()}</span></button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">{view === "code"? <CodeEditor value={current.content} language={languageFor(current.path)} /> : <Preview file={current} />}</div>
      {pushOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1422] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold flex items-center gap-2"><Github size={18}/> Push to GitHub</h2><p className="mt-1 text-xs text-muted">Select particular repo to push {files.length} files</p></div><button onClick={() => setPushOpen(false)} className="rounded-lg p-2 text-muted">×</button></div>{repos.length? <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} className="w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-sm text-white">{repos.map(repo => <option key={repo.id} value={repo.id}>{repo.full_name} {repo.private? "(Private)" : ""}</option>)}</select> : <div className="rounded-xl border border-line bg-panel2 p-4 text-sm text-muted">No repos. Create one.</div>}{pushMessage && <div className="mt-3 rounded-xl border border-line bg-panel2 p-3 text-xs text-slate-300">{pushMessage}</div>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setCreateRepoOpen(true)} className="rounded-xl border border-line px-3 py-2 text-xs text-slate-300">Create new</button><Button onClick={() => void pushSelected()} variant="primary" disabled={!selectedRepo || pushing ||!files.length}>{pushing? "Pushing…" : `Push ${files.length}`}</Button></div></div></div>}
      {deployOpen && <DeployModal chatId={chatId} files={files} onClose={() => setDeployOpen(false)} onDeployed={() => {}} />}
      {createRepoOpen && <CreateRepoModal name={newRepoName} setName={setNewRepoName} isPrivate={newRepoPrivate} setPrivate={setNewRepoPrivate} busy={pushing} onClose={() => setCreateRepoOpen(false)} onCreate={() => void createAndUseRepo()}/>}
    </section>
  );
}
function Preview({ file }: { file: VirtualFile }) { const isHtml = /\.html?$/i.test(file.path); if (!isHtml) return <div className="grid h-full place-items-center p-8 text-center text-sm text-muted"><div><Eye className="mx-auto mb-3" size={28}/><p>Preview for HTML only.</p></div></div>; return <iframe title="preview" className="h-full w-full border-0 bg-white" srcDoc={file.content} sandbox="allow-scripts" />; }
