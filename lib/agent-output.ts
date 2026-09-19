export type AgentFile = { path: string; content: string; action: string };
export function parseAgentFiles(text: string): AgentFile[] {
  const files: AgentFile[] = [];
  const seen = new Set<string>();
  const clean = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const regex = /"path"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]*?"action"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(clean))!== null) {
    try {
      const path = m[1];
      let content = m[2];
      try { content = JSON.parse('"'+content+'"'); } catch {}
      const action = m[3];
      if (!seen.has(path)) { seen.add(path); files.push({ path, content, action }); }
    } catch {}
  }
  return files;
}
export function parseAgentNotes(text: string, files: AgentFile[]) {
  return { changes: files.map(f=>({path:f.path, action:f.action})), nextSteps: [] };
}
