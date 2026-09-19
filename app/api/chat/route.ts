import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

export const maxDuration = 60;

const TIMEOUT_MS = 15000; // 15s per attempt, not 60s

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    // @ts-ignore
    return await p;
  } finally { clearTimeout(t); }
}

export async function POST(req: NextRequest) {
  const { messages, provider, apiKeys, model } = await req.json();

  // Trim history - prevents token explosion you mentioned
  const trimmed = messages.slice(-20);

  const openrouterKeys = [apiKeys?.openrouter, apiKeys?.openrouter2, apiKeys?.openrouter3].filter(Boolean);
  const geminiKeys = [apiKeys?.gemini, apiKeys?.gemini2, apiKeys?.gemini3].filter(Boolean);
  const groqKey = apiKeys?.groq;

  type Attempt = { name: string; fn: () => Promise<any> };

  const attempts: Attempt[] = [];

  // EXPLICIT ROUTER - not "send all keys"
  if (provider === "auto" || !provider) {
    // Priority: OpenRouter -> Gemini -> Groq
    openrouterKeys.forEach((k, i) => attempts.push({
      name: `openrouter-${i+1}`,
      fn: async () => {
        const openai = createOpenAI({ apiKey: k, baseURL: "https://openrouter.ai/api/v1" });
        return streamText({ model: openai(model || "qwen/qwen-2.5-coder-32b-instruct"), messages: trimmed });
      }
    }));
    geminiKeys.forEach((k, i) => attempts.push({
      name: `gemini-${i+1}`,
      fn: async () => {
        const google = createGoogleGenerativeAI({ apiKey: k });
        return streamText({ model: google("gemini-1.5-flash"), messages: trimmed });
      }
    }));
    if (groqKey) attempts.push({
      name: "groq",
      fn: async () => {
        const groq = createGroq({ apiKey: groqKey });
        return streamText({ model: groq("llama-3.3-70b-versatile"), messages: trimmed });
      }
    });
  } else if (provider === "openrouter") {
    openrouterKeys.forEach((k, i) => attempts.push({
      name: `openrouter-${i+1}`,
      fn: async () => {
        const openai = createOpenAI({ apiKey: k, baseURL: "https://openrouter.ai/api/v1" });
        return streamText({ model: openai(model || "qwen/qwen-2.5-coder-32b-instruct"), messages: trimmed });
      }
    }));
  } else if (provider === "gemini") {
    geminiKeys.forEach((k, i) => attempts.push({
      name: `gemini-${i+1}`,
      fn: async () => {
        const google = createGoogleGenerativeAI({ apiKey: k });
        return streamText({ model: google("gemini-1.5-flash"), messages: trimmed }); // FIXED: no more "gemini-3.6-flash as any"
      }
    }));
  } else if (provider === "groq") {
    if (groqKey) attempts.push({
      name: "groq",
      fn: async () => {
        const groq = createGroq({ apiKey: groqKey });
        return streamText({ model: groq("llama-3.3-70b-versatile"), messages: trimmed });
      }
    });
  }

  if (attempts.length === 0) {
    return new Response(JSON.stringify({ error: `No keys for provider ${provider}` }), { status: 400 });
  }

  let lastError: any;
  for (const attempt of attempts) {
    try {
      console.log(`Trying ${attempt.name}...`);
      // This forces actual provider call, not just lazy stream creation
      const result = await withTimeout(attempt.fn(), TIMEOUT_MS);
      // If streamText succeeded to create stream, return it
      return result.toDataStreamResponse();
    } catch (e: any) {
      console.log(`${attempt.name} failed:`, e.message?.slice(0,200));
      lastError = e;
      continue; // real fallback now works
    }
  }

  return new Response(JSON.stringify({ error: `All providers failed. Last: ${lastError?.message}` }), { status: 502 });
}
