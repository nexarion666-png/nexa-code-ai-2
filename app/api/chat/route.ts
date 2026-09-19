import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const maxDuration = 60;

const PROMPT = `You are Nexa Code AI. Build WHOLE project as MULTIPLE JSON LINES.
Each line: {"path":"relative/path","content":"FULL FILE CODE ESCAPED","action":"Created"}
No markdown, no explanation outside JSON lines.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKeys, apiKey } = await req.json();
    const geminiKey = apiKeys?.gemini || apiKey;
    const openrouterKey = apiKeys?.openrouter;

    if (!geminiKey && !openrouterKey) {
      return new Response(JSON.stringify({ error: "No API keys connected. Go to Settings." }), { status: 400 });
    }

    let result;

    // 1. Try Gemini first as you wanted
    if (geminiKey) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: geminiKey });
        const model = google("gemini-2.0-flash" as any);
        result = await streamText({ model, system: PROMPT, messages });
      } catch (err: any) {
        console.log("Gemini failed:", err.message);
        if (!openrouterKey) throw err;
      }
    }

    // 2. Fallback to OpenRouter (this will work for your quota issue)
    if (!result && openrouterKey) {
      const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: openrouterKey });
      const model = openrouter("google/gemini-2.0-flash-001");
      result = await streamText({ model, system: PROMPT, messages });
    }

    if (!result) throw new Error("No model available");

    return result.toDataStreamResponse();
  } catch (e: any) {
    console.error("CHAT API ERROR:", e);
    return new Response(JSON.stringify({ error: e.message || "AI request failed", details: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
