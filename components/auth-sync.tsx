"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const KEYS = ["nca-api-keys-v1", "github_token", "github_user", "vercel_token", "nca-chats-v1", "nca-chat-messages-v1", "nca-file-store-v2", "nca-vercel-deployments-v1", "nca-github-push-state-v1"];
const SYNC_DEBOUNCE_MS = 1200;

function browser() { return typeof window !== "undefined"; }
function read(key: string) { if (!browser()) return null; try { return window.localStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string | null) {
  if (!browser()) return;
  try { if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value); } catch {}
}

export function AuthSync() {
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignature = useRef("");

  useEffect(() => {
    if (!browser()) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    const supabase = createSupabaseBrowserClient();

    async function loadUserData(userId: string) {
      const { data, error } = await supabase.from("user_data").select("*").eq("user_id", userId).maybeSingle();
      if (error) {
        console.warn("NCA user_data load failed:", error.message);
        ready.current = true;
        return;
      }

      const row = data as { github_token?: string|null; vercel_token?: string|null; api_keys?: unknown; chats?: unknown } | null;
      if (row) {
        if (row.github_token) write("github_token", row.github_token);
        if (row.vercel_token) write("vercel_token", row.vercel_token);
        if (row.api_keys && typeof row.api_keys === "object") write("nca-api-keys-v1", JSON.stringify(row.api_keys));

        const bundle = row.chats as Record<string, unknown> | null;
        if (bundle && typeof bundle === "object") {
          for (const key of ["nca-chats-v1","nca-chat-messages-v1","nca-file-store-v2","nca-vercel-deployments-v1","nca-github-push-state-v1"]) {
            if (typeof bundle[key] === "string") write(key, bundle[key] as string);
          }
        }
      }
      ready.current = true;
      lastSignature.current = signature();
    }

    function signature() {
      return JSON.stringify(KEYS.map((key) => [key, read(key)]));
    }

    async function pushUserData(userId: string) {
      if (!ready.current) return;
      const bundle: Record<string, string | null> = {};
      for (const key of ["nca-chats-v1","nca-chat-messages-v1","nca-file-store-v2","nca-vercel-deployments-v1","nca-github-push-state-v1"]) bundle[key] = read(key);

      const apiKeys = read("nca-api-keys-v1");
      const payload = {
        user_id: userId,
        github_token: read("github_token"),
        vercel_token: read("vercel_token"),
        api_keys: apiKeys ? JSON.parse(apiKeys) : {},
        chats: bundle,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("user_data").upsert(payload, { onConflict: "user_id" });
      if (error) console.warn("NCA user_data save failed:", error.message);
      else lastSignature.current = signature();
    }

    let stopped = false;
    let currentUserId = "";

    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
        await loadUserData(user.id);
      } else {
        ready.current = false;
      }
    }

    function schedule() {
      if (!currentUserId || !ready.current) return;
      if (signature() === lastSignature.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void pushUserData(currentUserId); }, SYNC_DEBOUNCE_MS);
    }

    const interval = window.setInterval(schedule, 1000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (stopped) return;
      if (event === "SIGNED_IN" && session?.user) {
        currentUserId = session.user.id;
        ready.current = false;
        void loadUserData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        currentUserId = "";
        ready.current = false;
      }
    });

    void initialize();
    return () => {
      stopped = true;
      window.clearInterval(interval);
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
