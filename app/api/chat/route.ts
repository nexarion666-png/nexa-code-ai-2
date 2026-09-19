import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
export const maxDuration = 60;
const PROMPT = `You are Nexa Code AI. Build WHOLE project as MULTIPLE JSON LINES. Each line {"path":"...","content":"..."} No markdown.`;
export async function POST(req: NextRequest) {
  try {
    const { messages, apiKeys } = await req.json();
    const openrouterKeys = [apiKeys?.openrouter, apiKeys?.openrouter2, apiKeys?.openrouter3].filter(Boolean);
    const geminiKeys = [apiKeys?.gemini, apiKeys?.gemini2, apiKeys?.gemini3].filter(Boolean);
    for (const key of openrouterKeys) {
      try {
        const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: key });
        const result = await streamText({ model: openrouter("google/gemini-2.5-flash"), system: PROMPT, messages });
        return result.toDataStreamResponse();
      } catch (e:any){ continue; }
    }
    for (const key of geminiKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const result = await streamText({ model: google("gemini-3.6-flash" as any), system: PROMPT, messages });
        return result.toDataStreamResponse();
      } catch (e:any){ continue; }
    }
    return new Response(JSON.stringify({error:"All keys exhausted"}),{status:429});
  } catch (e:any){ return new Response(JSON.stringify({error:e.message}),{status:500}); }
}
