"use client";

import { create } from "zustand";

export type VirtualFile = {
  path: string;
  content: string;
  createdAt: string;
  mimeType?: string;
  isImage?: boolean;
  size?: number;
};

export type FileChange = {
  path: string;
  action: string;
};

export type FileState = {
  filesByChat: Record<string, VirtualFile[]>;
  activeFileByChat: Record<string, string | null>;
  changesByChat: Record<string, FileChange[]>;
  nextStepsByChat: Record<string, string[]>;
  hydrateChat: (chatId: string) => void;
  addOrUpdateFile: (chatId: string, file: Omit<VirtualFile, "createdAt"> & { createdAt?: string }) => void;
  addImage: (chatId: string, file: { path: string; content: string; mimeType: string; size: number }) => void;
  setActiveFile: (chatId: string, path: string | null) => void;
  setAgentNotes: (chatId: string, changes: FileChange[], nextSteps: string[]) => void;
  removeChat: (chatId: string) => void;
};

const STORAGE_KEY = "nca-file-store-v2";

type PersistedState = Pick<FileState, "filesByChat" | "activeFileByChat" | "changesByChat" | "nextStepsByChat">;

function isBrowser() {
  return typeof window !== "undefined";
}

function readPersisted(): PersistedState {
  if (!isBrowser()) return { filesByChat: {}, activeFileByChat: {}, changesByChat: {}, nextStepsByChat: {} };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as PersistedState;
  } catch {
    return { filesByChat: {}, activeFileByChat: {}, changesByChat: {}, nextStepsByChat: {} };
  }
}

function persist(state: PersistedState) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useFileStore = create<FileState>((set, get) => ({
  filesByChat: {},
  activeFileByChat: {},
  changesByChat: {},
  nextStepsByChat: {},

  hydrateChat: (chatId) => {
    const saved = readPersisted();
    set((state) => ({
      filesByChat: { ...state.filesByChat, [chatId]: saved.filesByChat?.[chatId] || state.filesByChat[chatId] || [] },
      activeFileByChat: { ...state.activeFileByChat, [chatId]: saved.activeFileByChat?.[chatId] ?? state.activeFileByChat[chatId] ?? null },
      changesByChat: { ...state.changesByChat, [chatId]: saved.changesByChat?.[chatId] || state.changesByChat[chatId] || [] },
      nextStepsByChat: { ...state.nextStepsByChat, [chatId]: saved.nextStepsByChat?.[chatId] || state.nextStepsByChat[chatId] || [] },
    }));
  },

  addOrUpdateFile: (chatId, incoming) => {
    set((state) => {
      const existing = state.filesByChat[chatId] || [];
      const file: VirtualFile = {
        path: incoming.path,
        content: incoming.content,
        createdAt: incoming.createdAt || new Date().toISOString(),
      };
      const index = existing.findIndex((item) => item.path === file.path);
      const files = index >= 0 ? existing.map((item, i) => (i === index ? file : item)) : [...existing, file];
      const next = {
        filesByChat: { ...state.filesByChat, [chatId]: files },
        activeFileByChat: { ...state.activeFileByChat, [chatId]: file.path },
        changesByChat: { ...state.changesByChat, [chatId]: [
          ...(state.changesByChat[chatId] || []).filter((change) => change.path !== file.path),
          { path: file.path, action: index >= 0 ? "Updated" : "Created" },
        ] },
      };
      persist({ ...state, ...next });
      return next;
    });
  },

  addImage: (chatId, incoming) => {
    set((state) => {
      const existing = state.filesByChat[chatId] || [];
      const file: VirtualFile = { ...incoming, createdAt: new Date().toISOString(), isImage: true };
      const files = [...existing.filter((item) => item.path !== file.path), file];
      const next = { filesByChat: { ...state.filesByChat, [chatId]: files } };
      persist({ ...state, ...next });
      return next;
    });
  },

  setActiveFile: (chatId, path) => {
    set((state) => {
      const next = { activeFileByChat: { ...state.activeFileByChat, [chatId]: path } };
      persist({ ...state, ...next });
      return next;
    });
  },

  setAgentNotes: (chatId, changes, nextSteps) => {
    set((state) => {
      const next = {
        changesByChat: { ...state.changesByChat, [chatId]: changes },
        nextStepsByChat: { ...state.nextStepsByChat, [chatId]: nextSteps },
      };
      persist({ ...state, ...next });
      return next;
    });
  },

  removeChat: (chatId) => {
    set((state) => {
      const filesByChat = { ...state.filesByChat };
      const activeFileByChat = { ...state.activeFileByChat };
      const changesByChat = { ...state.changesByChat };
      const nextStepsByChat = { ...state.nextStepsByChat };
      delete filesByChat[chatId];
      delete activeFileByChat[chatId];
      delete changesByChat[chatId];
      delete nextStepsByChat[chatId];
      const next = { filesByChat, activeFileByChat, changesByChat, nextStepsByChat };
      persist(next);
      return next;
    });
  },
}));

export function getChatFiles(chatId: string) {
  return useFileStore.getState().filesByChat[chatId] || [];
}
