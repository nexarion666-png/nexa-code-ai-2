import { Bot, MessageCircle } from "lucide-react";

export type Mode = "planner" | "agent";

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-panel2 p-1">
      <button onClick={() => onChange("planner")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${mode === "planner" ? "bg-violet-500/15 text-violet-200" : "text-muted"}`}>
        <MessageCircle size={14}/> Conversational Mode
      </button>
      <button onClick={() => onChange("agent")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${mode === "agent" ? "bg-blue-500/15 text-blue-200" : "text-muted"}`}>
        <Bot size={14}/> Agent Mode
      </button>
    </div>
  );
}
