import { MessageSquarePlus, Trash2, X, FolderOpen } from "lucide-react";
import { Button } from "./ui";
import Link from "next/link";

export type ChatItem = { id: string; title: string; time: string };

export function Sidebar({
  open, chats, activeId, onNew, onSelect, onDelete, onClose
}: {
  open: boolean; chats: ChatItem[]; activeId: string; onNew: () => void; onSelect: (id: string) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  return (
    <aside className={`${open ? "w-[280px] md:w-[280px]" : "w-0 md:w-0"} fixed bottom-0 left-0 top-[82px] z-40 shrink-0 overflow-hidden border-r border-line bg-[#060e19] shadow-2xl transition-all duration-200 md:relative md:top-0 md:shadow-none`}>
      <div className="flex h-full w-[280px] flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Chats</span>
          <Button className="h-8 w-8 p-0 md:hidden" onClick={onClose}><X size={17}/></Button>
        </div>
        <button onClick={onNew} className="mb-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 text-sm font-medium text-violet-200 hover:bg-violet-500/20">
          <MessageSquarePlus size={18}/> New Chat
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {chats.map(chat => (
            <div key={chat.id} className={`group flex items-center gap-2 rounded-xl px-3 py-3 ${activeId === chat.id ? "bg-white/[.07]" : "hover:bg-white/[.04]"}`}>
              <button onClick={() => onSelect(chat.id)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm">{chat.title}</div>
                <div className="mt-1 text-[11px] text-muted">{chat.time}</div>
              </button>
              <button onClick={() => onDelete(chat.id)} className="rounded-lg p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-300" aria-label="Delete chat">
                <Trash2 size={15}/>
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-line pt-4 text-xs text-muted"><Link href={activeId ? `/files?chat=${encodeURIComponent(activeId)}` : "/files"} className="mb-3 flex items-center gap-2 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white"><FolderOpen size={15}/> Files</Link>Phase 2 • File system</div>
      </div>
    </aside>
  );
}
