"use client";

import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { VirtualFile } from "@/lib/fileStore";

function languageFor(path: string) {
  if (path.endsWith(".tsx")) return "TSX";
  if (path.endsWith(".ts")) return "TS";
  if (path.endsWith(".css")) return "CSS";
  if (path.endsWith(".json")) return "JSON";
  if (path.endsWith(".html")) return "HTML";
  return "FILE";
}

type Node = { name: string; path: string; children?: Node[]; file?: VirtualFile };

function makeTree(files: VirtualFile[]): Node[] {
  const root: Node[] = [];
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let level = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = level.find((item) => item.name === part);
      if (!node) {
        node = { name: part, path: currentPath, children: index < parts.length - 1 ? [] : undefined, file: index === parts.length - 1 ? file : undefined };
        level.push(node);
      }
      if (node.children) level = node.children;
    });
  }
  return root.sort((a, b) => Number(Boolean(b.children)) - Number(Boolean(a.children)) || a.name.localeCompare(b.name));
}

export function FileExplorer({ files, activePath, onOpen }: { files: VirtualFile[]; activePath: string | null; onOpen: (path: string) => void }) {
  const tree = useMemo(() => makeTree(files), [files]);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#07111e]">
      <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[.16em] text-muted">Explorer</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tree.length ? tree.map((node) => <TreeNode key={node.path} node={node} activePath={activePath} onOpen={onOpen} depth={0} />) : (
          <div className="p-5 text-center text-sm text-muted">Agent-created files will appear here.</div>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, activePath, onOpen, depth }: { node: Node; activePath: string | null; onOpen: (path: string) => void; depth: number }) {
  const [open, setOpen] = useState(true);
  const isFolder = Boolean(node.children);
  if (isFolder) {
    return (
      <div>
        <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-300 hover:bg-white/5" style={{ paddingLeft: 8 + depth * 14 }}>
          {open ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}<Folder size={16} className="text-blue-300"/>{node.name}
        </button>
        {open && node.children?.map((child) => <TreeNode key={child.path} node={child} activePath={activePath} onOpen={onOpen} depth={depth + 1} />)}
      </div>
    );
  }
  return (
    <button onClick={() => onOpen(node.path)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${activePath === node.path ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:bg-white/5"}`} style={{ paddingLeft: 24 + depth * 14 }}>
      <FileCode2 size={15} className="text-cyan-300"/><span className="min-w-0 flex-1 truncate">{node.name}</span><span className="text-[9px] text-muted">{languageFor(node.path)}</span>
    </button>
  );
}
