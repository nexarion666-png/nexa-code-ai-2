 "use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { Provider, connectedProviders, getApiKey, saveApiKey } from "@/lib/storage";
import { Button } from "./ui";
import { GitHubActionsPanel, GitHubConnectHint } from "./github-ui";
import { VercelIntegrationPanel } from "./vercel-ui";

const providers: Array<{ id: Provider; name: string; hint: string }> = [
  { id: "openrouter", name: "OpenRouter", hint: "OpenAI-compatible models and many providers" },
  { id: "groq", name: "Groq", hint: "Fast open-source model inference" },
  { id: "gemini", name: "Gemini", hint: "Google Gemini models" }
];

export function SettingsPanel() {
  const [values, setValues] = useState<Record<Provider, string>>({ openrouter: "", groq: "", gemini: "" });
  const [saved, setSaved] = useState<Record<Provider, boolean>>({ openrouter: false, groq: false, gemini: false });

  useEffect(() => {
    (async () => {
      const next = { openrouter: "", groq: "", gemini: "" } as Record<Provider, string>;
      for (const p of providers) next[p.id] = await getApiKey(p.id);
      setValues(next);
      const connected = connectedProviders();
      setSaved({ openrouter: connected.includes("openrouter"), groq: connected.includes("groq"), gemini: connected.includes("gemini") });
    })();
  }, []);

  async function save(provider: Provider) {
    await saveApiKey(provider, values[provider]);
    setSaved(s => ({ ...s, [provider]: Boolean(values[provider].trim()) }));
  }

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="flex h-[82px] items-center gap-4 border-b border-line px-5 md:px-10">
        <Link href="/" className="rounded-xl p-2 text-muted hover:bg-white/5 hover:text-ink"><ArrowLeft/></Link>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600"><Sparkles size={20}/></div>
        <div><div className="font-semibold">Nexa Code AI</div><div className="text-xs text-muted">Settings</div></div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <div className="mb-8"><h1 className="text-2xl font-semibold">AI provider keys</h1><p className="mt-2 text-sm text-muted">Bring your own keys. Keys are encrypted in this browser before being stored in localStorage.</p></div>
        <div className="space-y-4">
          {providers.map(p => (
            <div key={p.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div><div className="flex items-center gap-2 font-medium"><KeyRound size={17} className="text-violet-300"/>{p.name}</div><p className="mt-1 text-xs text-muted">{p.hint}</p></div>
                {saved[p.id] && <span className="flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={15}/> Connected</span>}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="password" value={values[p.id]} onChange={e => setValues(v => ({ ...v, [p.id]: e.target.value }))} placeholder={`Paste ${p.name} API key`} className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm outline-none focus:border-violet-500/60"/>
                <Button variant="primary" onClick={() => save(p.id)}>Save key</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-[.14em] text-muted">Integrations</h2><div className="space-y-4"><GitHubActionsPanel /><VercelIntegrationPanel /><div><GitHubConnectHint /></div></div></div>
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-muted">
          <strong className="text-amber-200">Security note:</strong> browser localStorage is not a secure secret vault. Phase 1 encrypts the values with Web Crypto AES-GCM, but any script running in the same origin can potentially access the encryption key. A production-grade secret vault/auth layer should replace this before handling sensitive accounts.
        </div>
      </div>
    </main>
  );
}
