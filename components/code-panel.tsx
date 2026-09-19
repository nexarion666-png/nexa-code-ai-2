"use client";
import { Download, Github, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./monaco-editor";
import { VirtualFile } from "@/lib/fileStore";
import { beginGitHubOAuth, getGitHubToken, listGitHubRepos, pushFilesToGitHub, type GitHubRepo } from "@/lib/github";
import { CreateRepoModal } from "./github-ui";
import { Button } from "./ui";
import { DeployModal } from "./vercel-ui";
import { getVercelToken, markGitHubPush } from "@/lib/vercel";
const starter: VirtualFile = { path: "app/api/route.ts", content: `export async function GET(){ return Response.json({ok:1})}`, createdAt: new Date(0).toISOString(), };
function lang(p:string){ return "typescript"; }
export function CodePanel({ chatId, files, activePath, onOpen }: { chatId: string; files: VirtualFile[]; activePath: string | null; onOpen: (path: string) => void; changes?: any; nextSteps?: any; onNextStep?: any }) {
  const [view,setView]=useState<"code"|"preview">("code");
  const [downloading,setDownloading]=useState(false);
  const [pushOpen,setPushOpen]=useState(false);
  const [repos,setRepos]=useState<GitHubRepo[]>([]);
  const [selectedRepo,setSelectedRepo]=useState("");
  const [pushing,setPushing]=useState(false);
  const [pushMessage,setPushMessage]=useState("");
  const [createRepoOpen,setCreateRepoOpen]=useState(false);
  const [deployOpen,setDeployOpen]=useState(false);
  const [newRepoName,setNewRepoName]=useState("");
  const [newRepoPrivate,setNewRepoPrivate]=useState(true);
  const current=useMemo(()=>files.find((f:VirtualFile)=>f.path===activePath)||files[0]||starter,[files,activePath]);
  const visibleFiles=files.length?files:[starter];
  async function openPush(){ if(!getGitHubToken()){ try{ beginGitHubOAuth(); }catch(e:any){ setPushMessage(e.message);} return;} setPushOpen(true); try{ const list=await listGitHubRepos(); setRepos(list); if(list.length) setSelectedRepo(String(list[0].id)); }catch(e:any){ setPushMessage(e.message);} }
  async function pushSelected(){ const repo=repos.find(i=>String(i.id)===selectedRepo); if(!repo) return; setPushing(true); try{ const c=await pushFilesToGitHub(repo,files); markGitHubPush(chatId,repo.full_name); setPushMessage(`Pushed ${c}`);}catch(e:any){ setPushMessage(e.message);} finally{ setPushing(false);} }
  async function createAndUseRepo(){ if(!newRepoName.trim()) return; setPushing(true); try{ const {createGitHubRepo}=await import("@/lib/github"); const repo=await createGitHubRepo(newRepoName,newRepoPrivate); setRepos(c=>[repo,...c]); setSelectedRepo(String(repo.id)); setCreateRepoOpen(false);}catch(e:any){ setPushMessage(e.message);} finally{ setPushing(false);} }
  function openDeploy(){ if(!getVercelToken()){ setPushMessage("Connect Vercel"); return;} setDeployOpen(true); }
  async function downloadZip(){ if(downloading) return; setDownloading(true); try{ const JSZip=(await import("jszip")).default; const zip=new JSZip(); for(const f of files){ if(f.isImage&&f.content.startsWith("data:")){ const comma=f.content.indexOf(","); if(comma>-1) zip.file(f.path,f.content.slice(comma+1),{base64:true}); } else zip.file(f.path,f.content);} const blob=await zip.generateAsync({type:"blob"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`nexacode-${chatId}.zip`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);} finally{ setDownloading(false);} }
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel w-full overflow-hidden">
      <div className="flex flex-col border-b border-line bg-[#07111e] w-full">
        <div className="flex items-center px-2 py-1">
          <div className="flex gap-1 rounded-md bg-panel2 p-0.5"><button onClick={()=>setView("code")} className={`rounded px-2 py-1 text-[9px] ${view==="code"?"bg-white/10 text-white":"text-muted"}`}>Code</button><button onClick={()=>setView("preview")} className={`rounded px-2 py-1 text-[9px] ${view==="preview"?"bg-white/10 text-white":"text-muted"}`}>Preview</button></div>
        </div>
        {/* 3 EQUAL TINY BUTTONS - FORCED FIT */}
        <div className="flex w-full gap-1 px-1 py-1.5 border-t border-line/30 bg-[#0d1d31] overflow-hidden">
          <button onClick={downloadZip} className="flex flex-1 min-w-0 h-7 items-center justify-center gap-1 rounded bg-white text-[9px] font-bold text-black"><Download size={10}/>Down</button>
          <button onClick={()=>void openPush()} className="flex flex-1 min-w-0 h-7 items-center justify-center gap-1 rounded bg-violet-600 text-[9px] font-bold text-white"><Github size={10}/>Push</button>
          <button onClick={openDeploy} className="flex flex-1 min-w-0 h-7 items-center justify-center gap-1 rounded bg-black text-[9px] font-bold text-white ring-1 ring-white/20"><Rocket size={10}/>Deploy</button>
        </div>
        <div className="flex gap-1 px-1 py-1 overflow-x-auto w-full"><div className="flex gap-1">{visibleFiles.slice(0,8).map((f:VirtualFile)=>(<button key={f.path} onClick={()=>onOpen(f.path)} className={`max-w-[70px] shrink-0 truncate rounded border px-1.5 py-1 text-[8px] ${f.path===current.path?"bg-white/10 text-white":"bg-panel2 text-muted border-line"}`}>{f.path.split("/").pop()}</button>))}</div></div>
      </div>
      <div className="min-h-0 flex-1">{view==="code"?<CodeEditor value={current.content} language={lang(current.path)}/>:<iframe className="h-full w-full border-0 bg-white" srcDoc={current.content}/>}</div>
      {pushOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-xl bg-[#0a1422] border border-line p-4"><div className="flex justify-between"><h2 className="text-xs font-bold">Push</h2><button onClick={()=>setPushOpen(false)}>×</button></div><select value={selectedRepo} onChange={e=>setSelectedRepo(e.target.value)} className="mt-2 w-full rounded bg-panel2 p-2 text-xs">{repos.map(r=><option key={r.id} value={r.id}>{r.full_name}</option>)}</select>{pushMessage&&<div className="mt-2 text-[10px]">{pushMessage}</div>}<div className="mt-3 flex justify-end gap-2"><button onClick={()=>setCreateRepoOpen(true)} className="text-[10px] border px-2 py-1 rounded">New</button><Button onClick={()=>void pushSelected()} variant="primary" disabled={pushing}>{pushing?"...":`Push`}</Button></div></div></div>}
      {deployOpen&&<DeployModal chatId={chatId} files={files} onClose={()=>setDeployOpen(false)} onDeployed={()=>{}}/>}
      {createRepoOpen&&<CreateRepoModal name={newRepoName} setName={setNewRepoName} isPrivate={newRepoPrivate} setPrivate={setNewRepoPrivate} busy={pushing} onClose={()=>setCreateRepoOpen(false)} onCreate={()=>void createAndUseRepo()}/>}
    </section>
  );
}
