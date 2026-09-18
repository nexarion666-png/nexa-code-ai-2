"use client";

import { ChevronDown, Folder, Menu, UserRound, Sparkles, LogOut, Settings, UserCircle2 } from "lucide-react";
import { Button } from "./ui";
import { GitHubStatusButton } from "./github-ui";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Header({ sidebarOpen, onMenu }: { sidebarOpen: boolean; onMenu: () => void }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email || ""));
    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    if (typeof window === "undefined") return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <header className="flex h-[82px] shrink-0 items-center gap-4 border-b border-line px-5 md:px-8">
      <Button onClick={onMenu} aria-label="Toggle sidebar" className="h-11 w-11 p-0">
        <Menu size={25} />
      </Button>
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-glow">
          <Sparkles size={24} />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-semibold tracking-tight md:text-xl">Nexa <span className="text-violet-400">Code</span> <span className="text-blue-400">AI</span></div>
          <div className="text-xs text-muted md:text-sm">Plan <span className="mx-2">•</span> Code <span className="mx-2">•</span> Build</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="hidden h-12 min-w-[190px] items-center gap-3 rounded-2xl border border-line bg-panel2 px-4 text-left hover:bg-white/5 sm:flex">
          <Folder size={21} className="text-blue-300" />
          <span className="flex-1 text-sm">My Project</span>
          <ChevronDown size={18} className="text-muted" />
        </button>
        <GitHubStatusButton />
        <div className="relative">
          <Button aria-label="Profile" onClick={() => setOpen(v => !v)} className="h-12 w-12 rounded-full border border-line bg-panel2 p-0 font-semibold">
            {email ? initial : <UserRound size={22} />}
          </Button>
          {open && <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-line bg-panel p-2 shadow-2xl">
            <div className="flex items-center gap-3 rounded-xl bg-panel2 p-3"><UserCircle2 size={22} className="text-violet-300"/><div className="min-w-0"><div className="text-[10px] uppercase tracking-widest text-muted">Signed in</div><div className="truncate text-sm">{email || "Guest"}</div></div></div>
            <Link href="/" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5"><Folder size={17}/>My Projects</Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5"><Settings size={17}/>Settings</Link>
            {email && <button onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10"><LogOut size={17}/>Logout</button>}
          </div>}
        </div>
      </div>
    </header>
  );
}
