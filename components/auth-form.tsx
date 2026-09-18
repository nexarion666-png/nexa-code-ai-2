"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("Supabase is not configured yet. Add the two NEXT_PUBLIC_SUPABASE_* variables.");
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Account created. Check your email to confirm your address, then log in.");
        return;
      }
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMessage("");
    setGoogleBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("next") || "/")}` },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      setGoogleBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-glow"><Sparkles size={22}/></span>
          <span><span className="block text-base font-semibold">Nexa Code AI</span><span className="block text-xs text-muted">Plan • Code • Build</span></span>
        </Link>
        <section className="rounded-3xl border border-line bg-panel p-6 shadow-2xl md:p-8">
          <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "login" ? "Sign in to continue your projects across devices." : "Create an account to sync your projects and settings."}</p>
          <button onClick={() => void google()} disabled={googleBusy || busy} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-panel2 text-sm font-medium hover:bg-white/5 disabled:opacity-50">
            {googleBusy ? <Loader2 size={18} className="animate-spin"/> : <span className="font-bold">G</span>} Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted"><span className="h-px flex-1 bg-line"/>or<span className="h-px flex-1 bg-line"/></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-panel2 px-4 outline-none focus:border-violet-500/60" placeholder="you@example.com"/></label>
            <label className="block text-sm">Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-panel2 px-4 outline-none focus:border-violet-500/60" placeholder="At least 6 characters"/></label>
            {message && <div className="rounded-xl border border-line bg-panel2 p-3 text-xs leading-5 text-muted">{message}</div>}
            <button disabled={busy || googleBusy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin"/> : <>{mode === "login" ? "Log in" : "Create account"}<ArrowRight size={16}/></>}</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">{mode === "login" ? <>New to Nexa Code AI? <Link className="text-violet-300 hover:underline" href="/signup">Sign up</Link></> : <>Already have an account? <Link className="text-violet-300 hover:underline" href="/login">Log in</Link></>}</p>
        </section>
      </div>
    </main>
  );
}
