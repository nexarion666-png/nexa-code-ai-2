import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner. Ask 3-5 questions if needed. Then output FINAL PROPOSAL with Overview, Tech Stack, Features, File Structure, Data Model, Roadmap. End with EXACTLY: "Type 'Approved. Build it now' or click Approve to build?" Do NOT write code.`;

const AGENT_PROMPT = `You are Nexa Code AI. You HAVE file write access.
Build WHOLE project in ONE response as MULTIPLE JSON LINES.
Each line: {"path":"...","content":"...","action":"Updated"}
Order: lib/store.ts, components/ProductCard.tsx, components/CartDrawer.tsx, app/page.tsx
No markdown. After: Changes Applied: and Next Steps:`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, provider, apiKey, apiKeys } = body as any;
    let finalApiKey = apiKey;
    let finalProvider = provider || "gemini";
    if (!finalApiKey && apiKeys) {
      if (apiKeys.gemini) { finalApiKey = apiKeys.gemini; finalProvider = "gemini"; }
      else if (apiKeys.openrouter) { finalApiKey = apiKeys.openrouter; finalProvider = "openrouter"; }
    }
    if (!finalApiKey) return new Response(JSON.stringify({ error: "No API key" }), { status: 400 });

    const systemPrompt = mode === "planner" ? PLANNER_PROMPT : AGENT_PROMPT;
    let model;
    if (finalProvider === "gemini") {
      const google = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = google("gemini-3.6-flash" as any);
    } else {
      const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: finalApiKey });
      model = openrouter("google/gemini-3.6-flash");
    }

    const result = await streamText({ model, system: systemPrompt, messages, maxTokens: 32000, temperature: 0.2 });
    return result.toTextStreamResponse();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
