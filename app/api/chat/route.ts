import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner. Ask 3-5 questions if needed. Then output FINAL PROPOSAL. End with EXACTLY: "Type 'Approved. Build it now' or click Approve to build?"`;

const AGENT_PROMPT = `You are Nexa Code AI. Build WHOLE project as MULTIPLE JSON LINES.
Each line: {"path":"...","content":"...","action":"Updated"}
Order: lib/store.ts, components/ProductCard.tsx, components/CartDrawer.tsx, app/page.tsx
No markdown.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, mode, apiKey, apiKeys } = body as any;
  const systemPrompt = mode === "planner" ? PLANNER_PROMPT : AGENT_PROMPT;

  const geminiKey = apiKeys?.gemini || apiKey;
  const openrouterKey = apiKeys?.openrouter;

  // TRY GEMINI FIRST
  if (geminiKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: geminiKey });
      const model = google("gemini-3.6-flash" as any);
      const result = await streamText({ model, system: systemPrompt, messages, maxTokens: 32000, temperature: 0.2 });
      return result.toTextStreamResponse();
    } catch (e: any) {
      const msg = e.message || "";
      // If quota / rate limit, fall through to openrouter
      if (!msg.includes("quota") && !msg.includes("429") && !msg.includes("exceeded")) {
        // if other error, throw
        if (!openrouterKey) throw e;
      }
      console.log("Gemini quota hit, falling back to OpenRouter:", msg);
    }
  }

  // FALLBACK TO OPENROUTER (your other connected key)
  if (!openrouterKey) return new Response(JSON.stringify({ error: "Gemini quota exceeded and no OpenRouter key connected. Add OpenRouter key in Settings." }), { status: 429 });
  
  const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: openrouterKey });
  const model = openrouter("google/gemini-2.5-flash");
  const result = await streamText({ model, system: systemPrompt, messages, maxTokens: 32000, temperature: 0.2 });
  return result.toTextStreamResponse();
}
