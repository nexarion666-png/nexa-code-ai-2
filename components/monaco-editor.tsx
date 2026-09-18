"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function CodeEditor({ value, language }: { value: string; language: string }) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        padding: { top: 14 },
        smoothScrolling: true,
        wordWrap: "on",
        automaticLayout: true,
        readOnly: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
