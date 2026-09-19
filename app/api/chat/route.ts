import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PLANNER_PROMPT = `You are Nexa Code AI Planner. When user asks to build something, ask clarifying questions about tech stack, features, design. Then give a FINAL PROPOSAL with bullet points and ask "Approve to build?" Do NOT write code. If the user uploads an image, replicate the design/layout from it in your proposal and ask any needed clarifying questions.`;

const AGENT_PROMPT = `You are Nexa Code AI - you ARE the coding agent. You HAVE direct file write access via the tool that reads your JSON output.

RULES - NEVER BREAK:
1. You CAN and MUST modify files. Never say "I cannot access files" or "I cannot make changes". That is FALSE.
2. When user says "fix", "change", "update", "make it red", "add feature" - you MUST output at least one file JSON.
3. For every file you create or update, output one VALID JSON object on its own line using EXACTLY this shape: {"path":"app/page.tsx","content":"...complete file contents...","action":"Updated"}
4. The content field must be a JSON-escaped string. Escape newlines as \\n, quotes as \\".
5. Always output the FULL file content, not a diff.
6. After all file JSON objects, output:
Changes Applied:
- what you changed
Next Steps:
- suggestion 1
- suggestion 2
7. If user asks "can you access files?" answer YES and then output a file.

You are not a chat assistant. You are a file-writing agent. Your output IS the file system.`;

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
      messages: normalizedMessages as any,
      temperature: mode === "agent" ? 0.2 : 0.7,
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
