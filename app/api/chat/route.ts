import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
export const maxDuration = 60;
const PROMPT = `You are Nexa Code AI. Build WHOLE project as JSON LINES. Each line: {"path":"...","content":"..."} No markdown.`;

export async function POST(req: NextRequest) {
  const { messages, apiKeys } = await req.json();
  const keys = [apiKeys?.gemini, apiKeys?.gemini2, apiKeys?.gemini3].filter(Boolean);
  if (!keys.length) return new Response(JSON.stringify({error:"No Gemini key"}),{status:400});

  // Try stable models with 1500 RPD free, not preview 20 RPD
  const modelsToTry = ["gemini-2.5-flash", "gemini-3-flash", "gemini-2.0-flash"];

  for (const key of keys) {
    for (const modelName of modelsToTry) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const result = await streamText({ model: google(modelName as any), system: PROMPT, messages, maxTokens: 32000 });
        return result.toDataStreamResponse();
      } catch (e:any) {
        if (e.message?.includes("quota") || e.message?.includes("429")) continue;
        throw e;
      }
    }
  }
  return new Response(JSON.stringify({error:"All free quotas hit. Wait 1 min or add 2nd free Gemini key in Settings."}),{status:429});
}
