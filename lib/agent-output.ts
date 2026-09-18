export type AgentFile = { path: string; content: string; action: string };

function extractBalancedObjects(text: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j += 1) {
      const char = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          results.push(text.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }
  return results;
}

export function parseAgentFiles(text: string): AgentFile[] {
  const seen = new Set<string>();
  const files: AgentFile[] = [];
  for (const raw of extractBalancedObjects(text)) {
    try {
      const value = JSON.parse(raw) as Partial<AgentFile>;
      if (typeof value.path === "string" && typeof value.content === "string" && typeof value.action === "string" && !seen.has(value.path)) {
        seen.add(value.path);
        files.push({ path: value.path, content: value.content, action: value.action });
      }
    } catch {
      // Ignore non-file JSON objects such as unrelated metadata.
    }
  }
  return files;
}

export function parseAgentNotes(text: string, files: AgentFile[]) {
  const changes: { path: string; action: string }[] = files.map((file) => ({ path: file.path, action: file.action }));
  const nextSteps: string[] = [];
  const nextMatch = text.match(/Next Steps\s*:?[\s\S]*?(?=\n\s*(?:Changes Applied|FINAL PROPOSAL|$))/i);
  if (nextMatch) {
    for (const line of nextMatch[0].split("\n").slice(1)) {
      const cleaned = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
      if (cleaned) nextSteps.push(cleaned);
    }
  }
  return { changes, nextSteps };
}
