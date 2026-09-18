"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { FileExplorer } from "@/components/file-explorer";
import { CodePanel } from "@/components/code-panel";
import { useFileStore } from "@/lib/fileStore";

type ChatItem = { id: string; title: string; time: string };

export default function FilesPage() {
  const [chatId, setChatId] = useState("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const files = useFileStore((s) => chatId ? s.filesByChat[chatId] || [] : []);
  const activePath = useFileStore((s) => chatId ? s.activeFileByChat[chatId] || null : null);
  const changes = useFileStore((s) => chatId ? s.changesByChat[chatId] || [] : []);
  const nextSteps = useFileStore((s) => chatId ? s.nextStepsByChat[chatId] || [] : []);
  const hydrateChat = useFileStore((s) => s.hydrateChat);
  const setActiveFile = useFileStore((s) => s.setActiveFile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("nca-chats-v1") || "[]") as ChatItem[];
      setChats(saved);
      const fromUrl = new URLSearchParams(window.location.search).get("chat");
      const id = fromUrl || saved[0]?.id || "";
      setChatId(id);
      if (id) { hydrateChat(id); document.documentElement.dataset.chatId = id; }
    } catch {}
  }, [hydrateChat]);

  return <main className="flex h-dvh flex-col overflow-hidden bg-[#050b14]">
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4 md:px-6">
      <Link href="/" className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white"><ArrowLeft size={19}/></Link>
      <div className="flex items-center gap-2"><FolderOpen className="text-violet-400" size={20}/><span className="font-semibold">Nexa Code AI Files</span></div>
      <select value={chatId} onChange={(e) => { const id = e.target.value; setChatId(id); hydrateChat(id); if (typeof window !== "undefined") window.history.replaceState(null, "", `/files?chat=${encodeURIComponent(id)}`); }} className="ml-auto max-w-[220px] rounded-xl border border-line bg-panel2 px-3 py-2 text-sm outline-none">
        {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.title}</option>)}
      </select>
    </header>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="hidden w-[300px] shrink-0 border-r border-line lg:flex"><FileExplorer files={files} activePath={activePath} onOpen={(path) => setActiveFile(chatId, path)} /></aside>
      <section className="flex min-h-0 flex-1"><CodePanel chatId={chatId} files={files} activePath={activePath} onOpen={(path) => setActiveFile(chatId, path)} changes={changes} nextSteps={nextSteps} onNextStep={() => { if (typeof window !== "undefined") window.location.href = "/"; }} /></section>
    </div>
  </main>;
}
