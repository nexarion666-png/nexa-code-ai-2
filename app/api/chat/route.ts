import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner, focused strictly on system architecture, execution roadmaps, and technical planning.
- Ask 3-5 clarifying questions if needed
- Then output a structured FINAL PROPOSAL with: Overview, Tech Stack, Features, File Structure, Data Model, Roadmap
- At the end ALWAYS add EXACTLY: "Type 'Approved. Build it now' or click Approve to build?"
- Do NOT write code. Only plan.`;

const AGENT_PROMPT = `You are Nexa Code AI. You HAVE file write access. NEVER say you cannot access files.
You MUST build the WHOLE project in ONE response as MULTIPLE JSON LINES.
Each line is ONE file: {"path":"app/page.tsx","content":"...full file escaped...","action":"Updated"}
- Output files ONE AFTER ANOTHER, no markdown, no code fences, just raw JSON lines
- Keep each file FULL but compact (no huge comments)
- Build order: lib/store.ts, components/ProductCard.tsx, components/CartDrawer.tsx, app/page.tsx
- After all files write: Changes Applied: and Next Steps:
`;

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
    if (finalProvider === "openrouter") {
      const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: finalApiKey });
      model = openrouter("google/gemini-2.0-flash-001");
    } else {
      const google = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = google("gemini-2.0-flash");
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      maxTokens: 32000,
      temperature: 0.2,
    });

    return result.toTextStreamResponse();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
