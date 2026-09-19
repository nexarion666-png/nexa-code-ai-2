"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Paperclip, Send, Sparkles, CheckCircle2, X } from "lucide-react";
import { ModeToggle, Mode } from "./mode-toggle";
import { Button } from "./ui";
import { getApiKey, Provider, readRaw } from "@/lib/storage";
import { decryptSecret } from "@/lib/crypto";
import { parseAgentFiles, parseAgentNotes } from "@/lib/agent-output";
import { useFileStore } from "@/lib/fileStore";

type Message = { role: "user" | "assistant"; content: string };
const defaultProvider: Provider = "gemini";
const MESSAGE_KEY = "nca-chat-messages-v1";
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function readChats() {
  if (typeof window === "undefined") return {} as Record<string, Message[]>;
  try { return JSON.parse(localStorage.getItem(MESSAGE_KEY) || "{}") as Record<string, Message[]>; } catch { return {}; }
}

async function compressImage(file: File): Promise<{ dataUrl: string; mimeType: string; size: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length * 0.75 > IMAGE_MAX_BYTES && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const size = Math.ceil(dataUrl.length * 0.75);
  return { dataUrl, mimeType: "image/jpeg", size };
}

export function Chat({ chatId, mode, onModeChange, onTitle, onAgentOutput, onNextStep }: {
  chatId: string; mode: Mode; onModeChange: (mode: Mode) => void; onTitle: (title: string) => void;
  onAgentOutput: (chatId: string, payload: ReturnType<typeof parseAgentNotes> & { files: ReturnType<typeof parseAgentFiles> }) => void;
  onNextStep: (step: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ dataUrl: string; mimeType: string; size: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const addImage = useFileStore((s) => s.addImage);

  useEffect(() => {
    setMessages(readChats()[chatId] || []);
    if (typeof window !== "undefined") {
      const startingPrompt = window.localStorage.getItem("nca-starting-prompt");
      if (startingPrompt) { setInput(startingPrompt); window.localStorage.removeItem("nca-starting-prompt"); }
    }
    const handler = (event: Event) => { const detail = (event as CustomEvent<string>).detail; if (detail) setInput(detail); };
    window.addEventListener("nca-next-step", handler);
    return () => window.removeEventListener("nca-next-step", handler);
  }, [chatId]);
  useEffect(() => {
    if (typeof window !== "undefined") { const all = readChats(); all[chatId] = messages; localStorage.setItem(MESSAGE_KEY, JSON.stringify(all)); }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatId]);

  async function requestAgent(buildContext: string, history: Message[]) {
    const _raw = readRaw(); const _apiKeys: any = {}; for (const k of Object.keys(_raw)) { try { _apiKeys[k] = await decryptSecret(_raw[k as any]); } catch {} } const key = _apiKeys[defaultProvider] || _apiKeys.gemini || _apiKeys.openrouter || _apiKeys.groq || await getApiKey(defaultProvider); const apiKeys = _apiKeys;
    if (!key) { setMessages(prev => [...prev, { role: "assistant", content: "Connect an AI API key in Settings first. Then I can build with your key." }]); return; }
    const agentPrompt: Message = { role: "user", content: `Approved workflow. Build it now.\n\n${buildContext}` };
    const requestMessages = [...history, agentPrompt];
    setMessages(prev => [...prev, agentPrompt, { role: "assistant", content: "" }]);
    const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: requestMessages, mode: "agent", provider: defaultProvider, apiKey: key, apiKeys }) });
    if (!res.ok || !res.body) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "AI request failed."); }
    await consumeStream(res.body, true);
  }

  async function send() {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    const selectedImage = image;
    setInput(""); setImage(null);
    const visibleText = selectedImage ? `${text || "Please use this image as design inspiration."}\n\n[Image attached: ${selectedImage.name}]` : text;
    const next = [...messages, { role: "user" as const, content: visibleText }];
    setMessages(next);
    if (messages.length === 0) onTitle((text || "Image-inspired project").slice(0, 34) + ((text || "Image-inspired project").length > 34 ? "…" : ""));
    if (selectedImage) addImage(chatId, { path: `inspiration/${Date.now()}-${selectedImage.name.replace(/[^a-zA-Z0-9._-]/g, "-")}.jpg`, content: selectedImage.dataUrl, mimeType: selectedImage.mimeType, size: selectedImage.size });
    setBusy(true);
    try {
      const _raw = readRaw(); const _apiKeys: any = {}; for (const k of Object.keys(_raw)) { try { _apiKeys[k] = await decryptSecret(_raw[k as any]); } catch {} } const key = _apiKeys[defaultProvider] || _apiKeys.gemini || _apiKeys.openrouter || _apiKeys.groq || await getApiKey(defaultProvider); const apiKeys = _apiKeys;
      if (!key) { setMessages(prev => [...prev, { role: "assistant", content: "Connect an OpenRouter, Groq, or Gemini API key in Settings first. Then I can plan and build with your key." }]); return; }
      const apiMessages = selectedImage ? [...messages, { role: "user" as const, content: [{ type: "text", text: text || "Please use this image as design inspiration." }, { type: "image_url", image_url: selectedImage.dataUrl }] }] : next;
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: apiMessages, mode, provider: defaultProvider, apiKey: key, apiKeys }) });
      if (!res.ok || !res.body) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "AI request failed."); }
      await consumeStream(res.body, mode === "agent");
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Request failed."}` }]); }
    finally { setBusy(false); }
  }

  async function consumeStream(body: ReadableStream<Uint8Array>, parseFiles: boolean) {
    const reader = body.getReader(); const decoder = new TextDecoder(); let answer = "";
    setMessages(prev => prev.length && prev[prev.length - 1].role === "assistant" && prev[prev.length - 1].content === "" ? prev : [...prev, { role: "assistant", content: "" }]);
    while (true) { const { done, value } = await reader.read(); if (done) break; answer += decoder.decode(value, { stream: true }); setMessages(prev => { const copy=[...prev]; copy[copy.length-1]={ role:"assistant", content:answer }; return copy; }); }
    if (parseFiles) { const files = parseAgentFiles(answer); const notes = parseAgentNotes(answer, files); onAgentOutput(chatId, { files, ...notes }); }
  }

  async function approve(proposal: string) { if (busy) return; onModeChange("agent"); setBusy(true); try { await requestAgent(proposal, messages); } catch (e) { setMessages(prev => [...prev, { role:"assistant", content:`Error: ${e instanceof Error ? e.message : "Build request failed."}` }]); } finally { setBusy(false); } }
  async function chooseImage(file?: File) { if (!file) return; if (!file.type.startsWith("image/") || !["image/png", "image/jpeg", "image/jpg"].includes(file.type)) { setMessages(prev => [...prev, { role:"assistant", content:"Please choose a PNG or JPG image." }]); return; } try { const compressed = await compressImage(file); setImage({ ...compressed, name: file.name }); } catch { setMessages(prev => [...prev, { role:"assistant", content:"I could not process that image. Please try another PNG or JPG." }]); } }

  const lastAssistant = messages[messages.length - 1]?.role === "assistant" ? messages[messages.length - 1].content : "";
  const showApprove = mode === "planner" && /approve to build\??/i.test(lastAssistant) && !busy;
  return <section className="flex min-h-0 flex-1 flex-col bg-[#060e19]">
    <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4"><ModeToggle mode={mode} onChange={onModeChange}/><span className="hidden text-xs text-muted md:inline">{busy ? "Generating…" : "Ready"}</span></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-7"><div className="mx-auto max-w-2xl space-y-6">
      {messages.length === 0 && <div className="pt-12 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600"><Sparkles/></div><h2 className="text-xl font-semibold">What are we building?</h2><p className="mt-2 text-sm text-muted">Start in Conversational Mode. I&apos;ll clarify the idea, inspect inspiration images, propose a workflow, then build after approval.</p></div>}
      {messages.map((m,i)=><div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>{m.role === "assistant" && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600"><Sparkles size={17}/></div>}<div className={`${m.role === "user" ? "max-w-[85%] bg-[#0d2340]" : "max-w-[90%] bg-panel2"} rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap`}>{m.content || (busy ? "Generating…" : "")}{m.role === "assistant" && i === messages.length-1 && showApprove && <div className="mt-4 border-t border-line pt-3"><Button variant="primary" onClick={() => approve(m.content)}><CheckCircle2 size={16} className="mr-2"/>Approve to build</Button></div>}</div></div>)}<div ref={endRef}/>
    </div></div>
    <div className="border-t border-line p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] md:p-5"><div className="mx-auto max-w-3xl">
      {image && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-panel2 p-2"><Image src={image.dataUrl} alt="Inspiration preview" width={64} height={64} unoptimized className="h-16 w-16 rounded-xl object-cover"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{image.name}</div><div className="text-[10px] text-muted">{Math.max(1, Math.round(image.size/1024))} KB · compressed</div></div><button onClick={() => setImage(null)} className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-white/5" aria-label="Remove image"><X size={18}/></button></div>}
      <div className="flex items-center gap-1 rounded-2xl border border-[#28405e] bg-panel2 p-2 shadow-glow focus-within:border-violet-500/60"><Sparkles className="ml-2 shrink-0 text-violet-400" size={20}/><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send();}} placeholder="Ask Nexa Code AI..." className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted"/><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e=>{void chooseImage(e.target.files?.[0]); e.currentTarget.value="";}}/><button onClick={()=>fileInputRef.current?.click()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-white/5" aria-label="Upload inspiration image"><ImagePlus size={19}/></button><button className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-white/5" aria-label="Attach file"><Paperclip size={20}/></button><button disabled={(!input.trim()&&!image)||busy} onClick={()=>void send()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white disabled:opacity-40" aria-label="Send"><Send size={18}/></button></div>
    </div></div>
  </section>;
}
