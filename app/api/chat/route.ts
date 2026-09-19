import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
export const maxDuration = 60;
const PROMPT = `You are Nexa Code AI. Build WHOLE project as JSON LINES. {"path":"...","content":"..."} No markdown. One shot only.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKeys } = await req.json();
    
    // 1. Try OpenRouter FIRST - it still has 2.5-flash with 50 RPD free (better than Google's 20)
    if (apiKeys?.openrouter) {
      try {
        const openrouter = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: apiKeys.openrouter });
        const result = await streamText({ model: openrouter("google/gemini-2.5-flash"), system: PROMPT, messages });
        return result.toDataStreamResponse();
      } catch(e){ console.log("openrouter fail", e); }
    }

    // 2. Fallback to Google's forced 3.6-flash - 20 RPD
    if (apiKeys?.gemini) {
      const google = createGoogleGenerativeAI({ apiKey: apiKeys.gemini });
      const result = await streamText({ model: google("gemini-3.6-flash" as any), system: PROMPT, messages });
      return result.toDataStreamResponse();
    }

    return new Response(JSON.stringify({error:"No keys"}),{status:400});
  } catch(e:any){
    return new Response(JSON.stringify({error:e.message}),{status:500});
  }
}
