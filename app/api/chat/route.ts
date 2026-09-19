import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner. Ask clarifying questions then give FINAL PROPOSAL. Do NOT write code.`;

const AGENT_PROMPT = `You are Nexa Code AI. You HAVE file write access. NEVER say you cannot access files. You MUST output files as JSON: {"path":"app/page.tsx","content":"...full file...","action":"Updated"} with escaped newlines. Always full file. After files write Changes Applied: and Next Steps:`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, provider, apiKey } = body as any;
    if (!apiKey ||!messages?.length) {
      return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
    }
    let model;
    if (provider === "gemini") {
      const g = createGoogleGenerativeAI({ apiKey });
      model = g("gemini-1.5-flash");
    } else if (provider === "groq") {
      const g = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
      model = g("llama-3.1-8b-instant");
    } else {
      const o = createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
      model = o("openai/gpt-4o-mini");
    }
    const result = await streamText({
      model,
      system: mode === "planner"? PLANNER_PROMPT : AGENT_PROMPT,
      messages,
      temperature: mode === "agent"? 0.2 : 0.7,
    });
    return result.toTextStreamResponse();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
