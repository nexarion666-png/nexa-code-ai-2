"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Folder, MoreHorizontal, Wrench, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Header } from "./header";
import { Sidebar, ChatItem } from "./sidebar";
import { Chat } from "./chat";
import { CodePanel } from "./code-panel";
import { Mode } from "./mode-toggle";
import { FileExplorer } from "./file-explorer";
import { useFileStore } from "@/lib/fileStore";
import { DeploymentHistory } from "./vercel-ui";

const CHATS_KEY = "nca-chats-v1";

function nowLabel() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function loadChats(): ChatItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"); } catch { return []; }
}

export function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [mode, setMode] = useState<Mode>("planner");
  const [mobileTab, setMobileTab] = useState<"chat" | "code" | "files" | "tools">("chat");
  const searchParams = useSearchParams();
  const files = useFileStore((s) => activeId ? s.filesByChat[activeId] || [] : []);
  const activePath = useFileStore((s) => activeId ? s.activeFileByChat[activeId] || null : null);
  const changes = useFileStore((s) => activeId ? s.changesByChat[activeId] || [] : []);
  const nextSteps = useFileStore((s) => activeId ? s.nextStepsByChat[activeId] || [] : []);
  const hydrateChat = useFileStore((s) => s.hydrateChat);
  const addOrUpdateFile = useFileStore((s) => s.addOrUpdateFile);
  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const setAgentNotes = useFileStore((s) => s.setAgentNotes);

  useEffect(() => {
    const loaded = loadChats();
    if (loaded.length) { setChats(loaded); const requested = searchParams.get("chat"); setActiveId(requested && loaded.some(c => c.id === requested) ? requested : loaded[0].id); }
    else createChat();
  }, [searchParams]);

  useEffect(() => { if (activeId) hydrateChat(activeId); }, [activeId, hydrateChat]);
  useEffect(() => { if (activeId && typeof document !== "undefined") document.documentElement.dataset.chatId = activeId; }, [activeId]);

  function persist(items: ChatItem[]) { setChats(items); if (typeof window !== "undefined") localStorage.setItem(CHATS_KEY, JSON.stringify(items)); }
  function createChat() {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const item = { id, title: "New project chat", time: nowLabel() };
    setChats((prev) => { const next = [item, ...prev]; if (typeof window !== "undefined") localStorage.setItem(CHATS_KEY, JSON.stringify(next)); return next; });
    setActiveId(id); setMode("planner"); setMobileTab("chat"); hydrateChat(id);
  }
  function deleteChat(id: string) {
    const next = chats.filter((c) => c.id !== id); persist(next); useFileStore.getState().removeChat(id);
    if (typeof window !== "undefined") {
      try {
        const all = JSON.parse(localStorage.getItem("nca-chat-messages-v1") || "{}"); delete all[id]; localStorage.setItem("nca-chat-messages-v1", JSON.stringify(all));
      } catch {}
    }
    if (id === activeId) { if (next[0]) setActiveId(next[0].id); else createChat(); }
  }
  function rename(id: string, title: string) { persist(chats.map((c) => c.id === id ? { ...c, title, time: nowLabel() } : c)); }
  function handleAgentOutput(chatId: string, payload: { files: { path: string; content: string; action: string }[]; changes: { path: string; action: string }[]; nextSteps: string[] }) {
    for (const file of payload.files) addOrUpdateFile(chatId, file);
    setAgentNotes(chatId, payload.changes.length ? payload.changes : payload.files.map((file) => ({ path: file.path, action: file.action })), payload.nextSteps);
    if (payload.files.length) setMobileTab("code");
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <Header sidebarOpen={sidebarOpen} onMenu={() => setSidebarOpen((v) => !v)}/>
      <div className="flex min-h-0 flex-1">
        <Sidebar open={sidebarOpen} chats={chats} activeId={activeId} onNew={createChat} onSelect={(id) => { setActiveId(id); setMobileTab("chat"); }} onDelete={deleteChat} onClose={() => setSidebarOpen(false)}/>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className={`flex min-h-0 min-w-0 flex-1 ${mobileTab === "chat" ? "" : "hidden lg:flex"}`}>
              {activeId && <Chat key={activeId} chatId={activeId} mode={mode} onModeChange={setMode} onTitle={(title) => rename(activeId, title)} onAgentOutput={handleAgentOutput} onNextStep={(step) => { setMobileTab("chat"); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nca-next-step", { detail: step })); }}/>} 
            </div>
            <div className={`${mobileTab === "code" ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 border-l border-line lg:w-[46%] lg:flex-none`}>
              <CodePanel chatId={activeId} files={files} activePath={activePath} onOpen={(path: string) => setActiveFile(activeId, path)} changes={changes} nextSteps={nextSteps} onNextStep={() => setMobileTab("chat")}/>
            </div>
            <div className={`${mobileTab === "files" ? "flex" : "hidden lg:hidden"} min-h-0 min-w-0 flex-1`}>
              <FileExplorer files={files} activePath={activePath} onOpen={(path: string) => { setActiveFile(activeId, path); setMobileTab("code"); }}/>
            </div>
            <div className={`${mobileTab === "tools" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 lg:hidden`}><DeploymentHistory chatId={activeId}/></div>
          </div>
          <nav className="flex h-[68px] shrink-0 items-center justify-around border-t border-line bg-[#07111e] px-2 lg:hidden">
            <Tab icon={<MessageSquare size={20}/>} label="Chat" active={mobileTab === "chat"} onClick={() => setMobileTab("chat")}/>
            <Tab icon={<span className="font-mono text-sm">&lt;/&gt;</span>} label="Code" active={mobileTab === "code"} onClick={() => setMobileTab("code")}/>
            <button onClick={() => setMobileTab("files")} className={`flex flex-col items-center gap-1 px-4 py-1 text-[10px] ${mobileTab === "files" ? "text-violet-300" : "text-muted"}`}><Folder size={20}/>Files</button>
            <Tab icon={<Wrench size={20}/>} label="Tools" active={mobileTab === "tools"} onClick={() => setMobileTab("tools")}/>
            <Link href="/settings" className="flex flex-col items-center gap-1 px-4 py-1 text-[10px] text-muted"><MoreHorizontal size={20}/>More</Link>
          </nav>
        </div>
      </div>
    </main>
  );
}

function Tab({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex flex-col items-center gap-1 px-4 py-1 text-[10px] ${active ? "text-violet-300" : "text-muted"}`}>{icon}{label}</button>;
}
