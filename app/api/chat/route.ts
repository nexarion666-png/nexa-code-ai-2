import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner. When user asks to build something, ask clarifying questions about tech stack, features, design. Then give a FINAL PROPOSAL with bullet points and ask "Approve to build?" Do NOT write code. If the user uploads an image, replicate the design/layout from it in your proposal and ask any needed clarifying questions.`;
const AGENT_PROMPT = `You are Nexa Code AI Agent. You build apps. If the user uploads an image, replicate the design/layout from it. You build apps. When you receive an approved workflow, build the requested implementation. For every file you create or update, output one VALID JSON object using exactly this shape: {"path":"app/api/.../route.ts","content":"...complete file contents...","action":"Created"}. Use double quotes and valid JSON escaping. Do not put markdown fences around file JSON. After the file JSON objects, output a Changes Applied: block with bullet points and a Next Steps: block with clickable-friendly bullet prompts. Never omit file content. Keep implementation practical and concise.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, provider, apiKey } = body as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string | Array<Record<string, unknown>> }>;
      mode: "planner" | "agent";
      provider: "openrouter" | "groq" | "gemini";
      apiKey: string;
    };

    if (!apiKey || !messages?.length) {
      return new Response(JSON.stringify({ error: "API key and messages are required." }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    let model;
    if (provider === "gemini") {
      const google = createGoogleGenerativeAI({ apiKey });
      model = google("gemini-1.5-flash");
    } else if (provider === "groq") {
      const groq = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
      model = groq("llama-3.1-8b-instant");
    } else {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": "https://nexa-code-ai.local",
          "X-Title": "Nexa Code AI"
        }
      });
      model = openrouter("openai/gpt-4o-mini");
    }

    const normalizedMessages = messages.map((message) => {
      if (!Array.isArray(message.content)) return message;
      const content = message.content.map((part) => {
        if (part?.type === "image_url" && typeof part.image_url === "string") {
          return { type: "image", image: part.image_url };
        }
        if (part?.type === "text" && typeof part.text === "string") {
          return { type: "text", text: part.text };
        }
        return part;
      });
      return { ...message, content };
    });

    const result = await streamText({
      model,
      system: mode === "planner" ? PLANNER_PROMPT : AGENT_PROMPT,
      messages: normalizedMessages as any
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
