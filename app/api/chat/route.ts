import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
const PLANNER_PROMPT = `You are Nexa Code AI Planner. Ask clarifying questions then FINAL PROPOSAL and ask "Approve to build?" Do NOT write code.`;
const AGENT_PROMPT = `You are Nexa Code AI - you HAVE direct file write access via JSON output. NEVER say you cannot access files. That is FALSE. When user says fix/change/update, you MUST output at least one file JSON like {"path":"app/page.tsx","content":"...full file...","action":"Updated"} with JSON-escaped content. Always output FULL file, not diff. After files, output Changes Applied: and Next Steps: blocks. You ARE the file writer.`;
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, provider, apiKey } = body as any;
    if (!apiKey || !messages?.length) return new Response(JSON.stringify({ error: "API key and messages are required." }), { status: 400, headers: { "content-type": "application/json" } });
    let model;
    if (provider === "gemini") { const google = createGoogleGenerativeAI({ apiKey }); model = google("gemini-1.5-flash"); }
    else if (provider === "groq") { const groq = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" }); model = groq("llama-3.1-8b-instant"); }
    else { const openrouter = createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", headers: { "HTTP-Referer": "https://nexa-code-ai.local", "X-Title": "Nexa Code AI" } }); model = openrouter("openai/gpt-4o-mini"); }
    const normalizedMessages = messages.map((message: any) => {
      if (!Array.isArray(message.content)) return message;
      const content = message.content.map((part: any) => {
        if (part?.type === "image_url" && typeof part.image_url === "string") return { type: "image", image: part.image_url };
        if (part?.type === "text" && typeof part.text === "string") return { type: "text", text: part.text };
        return part;
      });
      return {...message, content };
    });
    const result = await streamText({ model, system: mode === "planner" ? PLANNER_PROMPT : AGENT_PROMPT, messages: normalizedMessages as any, temperature: mode === "agent" ? 0.2 : 0.7 });
    return result.toTextStreamResponse();
  } catch (error) { const message = error instanceof Error ? error.message : "AI request failed."; return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "content-type": "application/json" } }); }
}
