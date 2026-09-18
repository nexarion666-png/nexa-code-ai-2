"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearOAuthState, getSavedOAuthState, saveGitHubToken } from "@/lib/github";
import { Sparkles } from "lucide-react";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const returnedState = params.get("state");
      const savedState = getSavedOAuthState();
      if (!code || !returnedState || !savedState || returnedState !== savedState) {
        setError("GitHub connection could not be verified. Please try again.");
        return;
      }
      try {
        const redirectUri = `https://nexa-code-ai-2.vercel.app/github/callback`;
        const response = await fetch("/api/github/oauth/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        });
        const data = await response.json() as { access_token?: string; error?: string };
        if (!response.ok || !data.access_token) throw new Error(data.error || "GitHub connection failed.");
        saveGitHubToken(data.access_token);
        clearOAuthState();
        if (!cancelled) router.replace("/?github=connected");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "GitHub connection failed.");
      }
    }
    void finish();
    return () => { cancelled = true; };
  }, [router]);

  return <main className="grid min-h-dvh place-items-center bg-[#050b14] px-5 text-white">
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1524] p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600"><Sparkles /></div>
      <h1 className="text-xl font-semibold">Connecting GitHub…</h1>
      {error ? <><p className="mt-3 text-sm text-red-300">{error}</p><button onClick={() => router.replace("/")} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Return to Nexa Code AI</button></> : <p className="mt-3 text-sm text-slate-400">Completing secure OAuth connection.</p>}
    </div>
  </main>;
}
