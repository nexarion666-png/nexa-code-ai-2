"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { Provider, connectedProviders, getApiKey, saveApiKey } from "@/lib/storage";
import { Button } from "./ui";
import { GitHubActionsPanel, GitHubConnectHint } from "./github-ui";
import { VercelIntegrationPanel } from "./vercel-ui";
const providers: any = [
  { id: "openrouter", name: "OpenRouter Key 1", hint: "Main - fallback to 2/3" },
  { id: "openrouter2", name: "OpenRouter Key 2", hint: "Fallback" },
  { id: "openrouter3", name: "OpenRouter Key 3", hint: "Fallback" },
  { id: "gemini", name: "Gemini Key 1", hint: "Google Gemini" },
  { id: "gemini2", name: "Gemini Key 2", hint: "Fallback" },
  { id: "gemini3", name: "Gemini Key 3", hint: "Fallback" },
  { id: "groq", name: "Groq", hint: "Fast inference" },
];
export function SettingsPanel() {
  const [values, setValues] = useState<any>({ openrouter: "", openrouter2: "", openrouter3: "", groq: "", gemini: "", gemini2: "", gemini3: "" });
  const [saved, setSaved] = useState<any>({ openrouter: false, openrouter2: false, openrouter3: false, groq: false, gemini: false, gemini2: false, gemini3: false });
  useEffect(() => { (async () => {
      const next: any = {}; for (const p of providers) next[p.id] = await getApiKey(p.id);
      setValues(next); const connected = connectedProviders(); const s: any = {};
      for (const p of providers) s[p.id] = connected.includes(p.id); setSaved(s);
    })(); }, []);
  async function save(provider: Provider) { await saveApiKey(provider, values[provider]); setSaved((s:any)=>({...s, [provider]: Boolean(values[provider].trim()) })); }
  return (<main className="min-h-dvh bg-canvas"><header className="flex h-[82px] items-center gap-4 border-b border-line px-5 md:px-10"><Link href="/" className="rounded-xl p-2 text-muted hover:bg-white/5 hover:text-ink"><ArrowLeft/></Link><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600"><Sparkles size={20}/></div><div><div className="font-semibold">Nexa Code AI</div><div className="text-xs text-muted">Settings</div></div></header><div className="mx-auto max-w-3xl px-5 py-10 md:px-8"><div className="mb-8"><h1 className="text-2xl font-semibold">AI provider keys</h1><p className="mt-2 text-sm text-muted">Add 3 keys for auto-fallback when rate limited.</p></div><div className="space-y-4">{providers.map((p:any)=>(<div key={p.id} className="rounded-2xl border border-line bg-panel p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-medium"><KeyRound size={17} className="text-violet-300"/>{p.name}</div><p className="mt-1 text-xs text-muted">{p.hint}</p></div>{saved[p.id] && <span className="flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={15}/> Connected</span>}</div><div className="flex flex-col gap-2 sm:flex-row"><input type="password" value={values[p.id]||""} onChange={e => setValues((v:any) => ({...v, [p.id]: e.target.value }))} placeholder={"Paste "+p.name+" API key"} className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm outline-none focus:border-violet-500/60"/><Button variant="primary" onClick={() => save(p.id)}>Save key</Button></div></div>))}</div><div className="mt-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-[.14em] text-muted">Integrations</h2><div className="space-y-4"><GitHubActionsPanel /><VercelIntegrationPanel /><div><GitHubConnectHint /></div></div></div></div></main>);
}
