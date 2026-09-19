export type AgentFile = { path: string; content: string; action: string };

function findStringEnd(text: string, start: number): number {
  // start points at opening "
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") { i += 2; continue; }
    if (c === '"') return i;
    i++;
  }
  return -1;
}

function extractFilesTolerant(input: string): AgentFile[] {
  const files: AgentFile[] = [];
  const seen = new Set<string>();
  // strip code fences like ```json... ```
  const text = input.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (_, inner) => inner);

  let idx = 0;
  while (idx < text.length) {
    const pathKey = text.indexOf('"path"', idx);
    if (pathKey === -1) break;
    const colon1 = text.indexOf(":", pathKey);
    if (colon1 === -1) break;
    const pathQuote = text.indexOf('"', colon1);
    if (pathQuote === -1) break;
    const pathEnd = findStringEnd(text, pathQuote);
    if (pathEnd === -1) break;
    const pathVal = JSON.parse(text.slice(pathQuote, pathEnd + 1));

    const contentKey = text.indexOf('"content"', pathEnd);
    if (contentKey === -1) { idx = pathEnd + 1; continue; }
    const colon2 = text.indexOf(":", contentKey);
    const contentQuote = text.indexOf('"', colon2);
    if (contentQuote === -1) break;

    // find end of content string: look for ", "action"
    // We must find a " that is followed by optional spaces, comma, optional spaces, "action"
    let contentEnd = -1;
    let scan = contentQuote + 1;
    while (scan < text.length) {
      const q = text.indexOf('"', scan);
      if (q === -1) break;
      // skip escaped
      let back = 0; let k = q - 1;
      while (k >= 0 && text[k] === "\\") { back++; k--; }
      if (back % 2 === 1) { scan = q + 1; continue; }
      const after = text.slice(q + 1, q + 20);
      if (/^\s*,\s*"action"\s*:/.test(after)) { contentEnd = q; break; }
      scan = q + 1;
    }
    if (contentEnd === -1) break;

    let rawContent = text.slice(contentQuote + 1, contentEnd);
    // Try to unescape as JSON string, tolerant to raw newlines
    let contentVal: string;
    try {
      contentVal = JSON.parse('"' + rawContent.replace(/\n/g, "\\n").replace(/\r/g, "") + '"');
    } catch {
      // fallback: unescape common sequences manually
      contentVal = rawContent
       .replace(/\\n/g, "\n")
       .replace(/\\"/g, '"')
       .replace(/\\t/g, "\t")
       .replace(/\\\\/g, "\\");
    }

    const actionKey = text.indexOf('"action"', contentEnd);
    if (actionKey === -1) break;
    const colon3 = text.indexOf(":", actionKey);
    const actionQuote = text.indexOf('"', colon3);
    const actionEnd = findStringEnd(text, actionQuote);
    if (actionEnd === -1) break;
    const actionVal = JSON.parse(text.slice(actionQuote, actionEnd + 1));

    if (typeof pathVal === "string" &&!seen.has(pathVal) && pathVal.includes(".")) {
      seen.add(pathVal);
      files.push({ path: pathVal, content: contentVal, action: typeof actionVal === "string"? actionVal : "Updated" });
    }
    idx = actionEnd + 1;
  }
  return files;
}

export function parseAgentFiles(text: string): AgentFile[] {
  const files = extractFilesTolerant(text);
  if (files.length) return files;
  // Fallback to old strict parser
  const results: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i]!== "{") continue;
    let depth = 0; let inStr = false; let esc = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === "{") depth++; else if (ch === "}") { depth--; if (depth === 0) { results.push(text.slice(i, j + 1)); i = j; break; } }
    }
  }
  const seen = new Set<string>();
  const out: AgentFile[] = [];
  for (const raw of results) {
    try {
      const v = JSON.parse(raw) as any;
      if (v?.path && v?.content &&!seen.has(v.path)) { seen.add(v.path); out.push(v); }
    } catch {}
  }
  return out;
}

export function parseAgentNotes(text: string, files: AgentFile[]) {
  const changes = files.map(f => ({ path: f.path, action: f.action }));
  const nextSteps: string[] = [];
  const m = text.match(/Next Steps\s*:?([\s\S]*?)(?:Changes Applied|$)/i);
  if (m) {
    for (const line of m[1].split("\n")) {
      const c = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
      if (c) nextSteps.push(c);
    }
  }
  return { changes, nextSteps };
}
