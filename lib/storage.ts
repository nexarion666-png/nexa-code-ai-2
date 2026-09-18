import { decryptSecret, encryptSecret } from "./crypto";

export type Provider = "openrouter" | "groq" | "gemini";
const KEY = "nca-api-keys-v1";
type StoredKeys = Partial<Record<Provider, string>>;

function isBrowser() { return typeof window !== "undefined"; }

export async function saveApiKey(provider: Provider, value: string) {
  if (!isBrowser()) return;
  const current = readRaw();
  if (value.trim()) current[provider] = await encryptSecret(value.trim());
  else delete current[provider];
  localStorage.setItem(KEY, JSON.stringify(current));
}

export function readRaw(): StoredKeys {
  if (!isBrowser()) return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export async function getApiKey(provider: Provider) {
  if (!isBrowser()) return "";
  const encrypted = readRaw()[provider];
  if (!encrypted) return "";
  return decryptSecret(encrypted);
}

export function connectedProviders(): Provider[] {
  if (!isBrowser()) return [];
  return Object.keys(readRaw()) as Provider[];
}
