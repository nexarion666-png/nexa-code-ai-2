const KEY_NAME = "nca-local-encryption-key-v1";

function isBrowser() { return typeof window !== "undefined"; }

async function getKey(): Promise<CryptoKey> {
  if (!isBrowser()) throw new Error("Encryption is only available in the browser.");
  const existing = localStorage.getItem(KEY_NAME);
  if (existing) {
    return crypto.subtle.importKey("jwk", JSON.parse(existing), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(KEY_NAME, JSON.stringify(jwk));
  return key;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function encryptSecret(value: string) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const key = await getKey();
  const [ivPart, dataPart] = value.split(".");
  if (!ivPart || !dataPart) throw new Error("Invalid encrypted secret.");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivPart) }, key, base64ToBytes(dataPart));
  return new TextDecoder().decode(decrypted);
}
