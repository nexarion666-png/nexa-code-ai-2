"use client";
import { Download, FileCode2, Eye, Github, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./monaco-editor";
import { VirtualFile } from "@/lib/fileStore";
import { beginGitHubOAuth, getGitHubToken, listGitHubRepos, pushFilesToGitHub, type GitHubRepo } from "@/lib/github";
import { CreateRepoModal } from "./github-ui";
import { Button } from "./ui";
import { DeployModal } from "./vercel-ui";
import { getVercelToken, markGitHubPush } from "@/lib/vercel";
const starter: VirtualFile = { path: "app/api/route.ts", content: `export async function GET(){ return Response.json({ ok: 1 })}`, createdAt: new Date(0).toISOString(), };
function lang(p: string){ if(p.endsWith(".tsx")||p.endsWith(".ts")) return "typescript"; if(p.endsWith(".js")) return "javascript"; if(p.endsWith(".css")) return "css"; if(p.endsWith(".json")) return "json"; if(p.endsWith(".html")) return "html"; return "plaintext"; }
export function CodePanel({ chatId, files, activePath, onOpen, changes, nextSteps, onNextStep }: { chatId: string; files: VirtualFile[]; activePath: string | null; onOpen: (path: string) => void; changes: any; nextSteps: any; onNextStep: any }) {
  const [view, setView] = useState<"code"|"preview">("code");
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
  const current = useMemo(() => files.find((f: VirtualFile) => f.path === activePath) || files[0] || starter, [files, activePath]);
  const visibleFiles = files.length? files : [starter];
  async function openPush(){ setPushMessage(""); if(!getGitHubToken()){ try{ beginGitHubOAuth(); }catch(e:any){ setPushMessage(e.message);} return;} setPushOpen(true); try{ const list=await listGitHubRepos(); setRepos(list); if(list.length&&!selectedRepo) setSelectedRepo(String(list[0].id)); }catch(e:any){ setPushMessage(e.message);} }
  async function pushSelected(){ const repo=repos.find(i=>String(i.id)===selectedRepo); if(!repo){ setPushMessage("Select repo"); return;} setPushing(true); try{ const c=await pushFilesToGitHub(repo, files); markGitHubPush(chatId, repo.full_name); setPushMessage(`Pushed ${c} to ${repo.full_name}`);}catch(e:any){ setPushMessage(e.message);} finally{ setPushing(false);} }
  async function createAndUseRepo(){ if(!newRepoName.trim()) return; setPushing(true); try{ const {createGitHubRepo}=await import("@/lib/github"); const repo=await createGitHubRepo(newRepoName,newRepoPrivate); setRepos(c=>[repo,...c]); setSelectedRepo(String(repo.id)); setCreateRepoOpen(false); setNewRepoName(""); setPushMessage(`Created ${repo.full_name}`);}catch(e:any){ setPushMessage(e.message);} finally{ setPushing(false);} }
  function openDeploy(){ if(!getVercelToken()){ setPushMessage("Connect Vercel in Settings"); return;} setDeployOpen(true); }
  async function downloadZip(){ if(downloading) return; setDownloading(true); try{ const JSZip=(await import("jszip")).default; const zip=new JSZip(); for(const f of files){ if(f.isImage&&f.content.startsWith("data:")){ const comma=f.content.indexOf(","); if(comma>-1) zip.file(f.path,f.content.slice(comma+1),{base64:true}); } else zip.file(f.path,f.content);} if(!files.length) zip.file(starter.path,starter.content); const blob=await zip.generateAsync({type:"blob"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`nexacode-${chatId}.zip`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);} finally{ setDownloading(false);} }
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex flex-col border-b border-line bg-[#07111e]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center rounded-lg bg-panel2 p-0.5">
            <button onClick={()=>setView("code")} className={`rounded-md px-2.5 py-1 text-[10px] ${view==="code"?"bg-white/10 text-white":"text-muted"}`}>Code</button>
            <button onClick={()=>setView("preview")} className={`rounded-md px-2.5 py-1 text-[10px] ${view==="preview"?"bg-white/10 text-white":"text-muted"}`}>Preview</button>
          </div>
        </div>
        {/* ULTRA SMALL 3 EQUAL BUTTONS */}
        <div className="grid grid-cols-3 gap-1.5 px-2 py-2 border-t border-line/40 bg-[#0d1d31]">
          <button onClick={downloadZip} className="flex h-8 items-center justify-center gap-1 rounded-md bg-white text-[10px] font-bold text-black"><Download size={11}/>Download</button>
          <button onClick={()=>void openPush()} className="flex h-8 items-center justify-center gap-1 rounded-md bg-violet-600 text-[10px] font-bold text-white"><Github size={11}/>Push</button>
          <button onClick={openDeploy} className="flex h-8 items-center justify-center gap-1 rounded-md bg-black text-[10px] font-bold text-white ring-1 ring-white/20"><Rocket size={11}/>Deploy</button>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-t border-line/20">
          {visibleFiles.map((f: VirtualFile) => (
            <button key={f.path} onClick={()=>onOpen(f.path)} className={`flex max-w-[90px] shrink-0 items-center rounded-md border px-2 py-1 text-[9px] ${f.path===current.path?"bg-[#0a1422] text-white border-violet-500/30":"bg-panel2 text-muted border-line"}`}><span className="truncate">{f.path.split("/").pop()}</span></button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">{view==="code"? <CodeEditor value={current.content} language={lang(current.path)} /> : <iframe title="preview" className="h-full w-full border-0 bg-white" srcDoc={current.content} sandbox="allow-scripts" />}</div>
      {pushOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1422] p-5"><div className="flex justify-between mb-3"><h2 className="font-semibold text-sm flex items-center gap-2"><Github size={16}/>Push</h2><button onClick={()=>setPushOpen(false)}>×</button></div><select value={selectedRepo} onChange={e=>setSelectedRepo(e.target.value)} className="w-full rounded-xl border border-line bg-panel2 px-3 py-2 text-sm text-white">{repos.map(r=><option key={r.id} value={r.id}>{r.full_name}</option>)}</select>{pushMessage && <div className="mt-3 rounded-lg bg-panel2 p-2 text-xs">{pushMessage}</div>}<div className="mt-4 flex justify-end gap-2"><button onClick={()=>setCreateRepoOpen(true)} className="text-xs border border-line px-3 py-2 rounded-lg">New</button><Button onClick={()=>void pushSelected()} variant="primary" disabled={pushing}>{pushing?"...":`Push ${files.length}`}</Button></div></div></div>}
      {deployOpen && <DeployModal chatId={chatId} files={files} onClose={()=>setDeployOpen(false)} onDeployed={()=>{}} />}
      {createRepoOpen && <CreateRepoModal name={newRepoName} setName={setNewRepoName} isPrivate={newRepoPrivate} setPrivate={setNewRepoPrivate} busy={pushing} onClose={()=>setCreateRepoOpen(false)} onCreate={()=>void createAndUseRepo()}/>}
    </section>
  );
}
