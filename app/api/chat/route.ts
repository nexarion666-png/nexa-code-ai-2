import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
const PLANNER_PROMPT = `You are Nexa Code AI Planner. Ask clarifying questions then give FINAL PROPOSAL. Do NOT write code.`;
const AGENT_PROMPT = `You are Nexa Code AI. You HAVE file write access. NEVER say you cannot access files. You MUST output files as JSON: {"path":"app/page.tsx","content":"...full file...","action":"Updated"} with escaped newlines. Always full file. After files write Changes Applied: and Next Steps:`;
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, provider, apiKey, apiKeys, filesContent } = body as any;
    let finalApiKey = apiKey;
    let finalProvider = provider || "gemini";
    if (!finalApiKey && apiKeys) {
      if (apiKeys.gemini) { finalApiKey = apiKeys.gemini; finalProvider = "gemini"; }
      else if (apiKeys.openrouter) { finalApiKey = apiKeys.openrouter; finalProvider = "openrouter"; }
      else if (apiKeys.groq) { finalApiKey = apiKeys.groq; finalProvider = "groq"; }
    }
    if (!finalApiKey ||!messages?.length) {
      return new Response(JSON.stringify({ error: "Connect an OpenRouter, Groq, or Gemini API key in Settings first. Then I can plan and build with your key." }), { status: 400 });
    }
    let model;
    if (finalProvider === "gemini") {
      const g = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = g("gemini-2.0-flash");
    } else if (finalProvider === "groq") {
      const g = createOpenAI({ apiKey: finalApiKey, baseURL: "https://api.groq.com/openai/v1" });
      model = g("llama-3.3-70b-versatile");
    } else {
      const o = createOpenAI({ apiKey: finalApiKey, baseURL: "https://openrouter.ai/api/v1" });
      model = o("google/gemini-2.0-flash-exp:free");
    }
    const fileList = filesContent? Object.keys(filesContent).slice(0,50).join("\n") : "No files";
    const lastIdx = messages.length - 1;
    if (messages[lastIdx]?.role === "user") { messages[lastIdx].content += `\n\n[Project files: ${fileList}]`; }
    const result = await streamText({ model, system: mode === "planner"? PLANNER_PROMPT : AGENT_PROMPT, messages, temperature: mode === "agent"? 0.2 : 0.7, maxTokens: 4096 });
    return result.toTextStreamResponse();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
