"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Boxes, CheckCircle2, LayoutDashboard, MessageSquare, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatItem = { id: string; title: string; time: string };
const CHATS_KEY = "nca-chats-v1";

const templates = [
  { name: "SaaS", description: "A polished product workspace with auth-ready screens.", icon: Boxes, prompt: "Build a modern SaaS application with a dashboard, pricing page, responsive navigation, and a clean dark design." },
  { name: "Landing", description: "High-converting landing pages with clear sections.", icon: LayoutDashboard, prompt: "Build a modern responsive landing page with a hero, features, testimonials, pricing, and a strong call to action." },
  { name: "Dashboard", description: "Analytics, tables, cards, and business insights.", icon: BarChart3, prompt: "Build a responsive analytics dashboard with KPI cards, charts, filters, and a recent activity table." },
  { name: "E-commerce", description: "Storefront UI, product grids, cart-ready flows.", icon: Store, prompt: "Build a modern e-commerce storefront with a product grid, product detail view, search, filters, and cart UI." },
];

export function LandingPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setChats(JSON.parse(window.localStorage.getItem(CHATS_KEY) || "[]")); } catch { setChats([]); }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
  }, []);

  const recent = useMemo(() => chats.slice(0, 6), [chats]);
  function start(value = prompt) {
    if (typeof window !== "undefined" && value.trim()) window.localStorage.setItem("nca-starting-prompt", value.trim());
    router.push("/chat");
  }

  return <main className="min-h-dvh bg-canvas text-ink">
    <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-glow"><Sparkles size={20}/></span><span><span className="block text-sm font-semibold">Nexa Code AI</span><span className="block text-[10px] text-muted">Plan • Code • Build</span></span></Link>
        <div className="flex items-center gap-2"><div className="relative"><button onClick={() => setProjectsOpen(v => !v)} className="min-h-11 rounded-xl border border-line bg-panel2 px-4 text-sm hover:bg-white/5">My Projects</button>{projectsOpen && <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-line bg-panel p-2 shadow-2xl">{recent.length ? recent.map(c => <button key={c.id} onClick={() => router.push(`/chat?chat=${encodeURIComponent(c.id)}`)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5"><MessageSquare size={15} className="text-violet-300"/><span className="min-w-0 flex-1 truncate text-sm">{c.title}</span><span className="text-[10px] text-muted">{c.time}</span></button>) : <div className="p-3 text-xs text-muted">Your projects will appear here.</div>}<Link href="/chat" className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-white text-sm font-semibold text-black">Open workspace</Link></div>}</div><Link href="/chat" className="hidden min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black sm:flex">Start Building <ArrowRight size={16}/></Link></div>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-4 pt-5 md:px-8">{!loggedIn && <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-center text-xs text-muted">You can explore locally. <Link href="/login" className="font-semibold text-violet-300">Login to save your projects, keys, and integrations across devices.</Link></div>}</div>\n    <section className="relative overflow-hidden px-4 pb-14 pt-20 md:pb-24 md:pt-28"><div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl"/><div className="relative mx-auto max-w-5xl text-center"><div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200"><Sparkles size={14}/> AI-powered software building</div><h1 className="text-4xl font-bold tracking-tight md:text-7xl">Nexa Code AI</h1><p className="mt-3 text-lg font-medium text-violet-300 md:text-2xl">Plan • Code • Build</p><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted md:text-base">Bring an idea, describe what you want, and let NCA plan the workflow, generate the files, and turn your concept into a working project.</p>
      <div className="mx-auto mt-9 max-w-3xl rounded-3xl border border-[#28405e] bg-panel2 p-3 shadow-glow"><div className="flex flex-col gap-3 md:flex-row md:items-center"><Sparkles className="mx-2 shrink-0 text-violet-400" size={21}/><input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") start(); }} placeholder="What do you want to build?" className="min-h-12 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted md:text-base"/><button onClick={() => start()} disabled={!prompt.trim()} className="min-h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 text-sm font-semibold text-white disabled:opacity-40">Start Building</button></div></div>
    </div></section>
    <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-muted">Start faster</p><h2 className="mt-2 text-2xl font-semibold">Templates</h2></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{templates.map(t => { const Icon=t.icon; return <button key={t.name} onClick={() => start(t.prompt)} className="group min-h-44 rounded-2xl border border-line bg-panel p-5 text-left transition hover:-translate-y-1 hover:border-violet-500/40 hover:bg-panel2"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-violet-300"><Icon size={21}/></span><h3 className="mt-5 font-semibold">{t.name}</h3><p className="mt-2 text-xs leading-5 text-muted">{t.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs text-violet-300 opacity-0 transition group-hover:opacity-100">Use template <ArrowRight size={13}/></span></button>; })}</div></section>
    <footer className="border-t border-line px-4 py-7 text-center text-xs text-muted">Built with Nexa Code AI <span className="mx-1">•</span> Plan • Code • Build</footer>
  </main>;
}
