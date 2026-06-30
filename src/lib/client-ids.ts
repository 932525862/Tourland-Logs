const KEY = "crm_client_ids";

export function getStoredClientIds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function storeClientId(clientId: string, code: string): void {
  const ids = getStoredClientIds();
  ids[clientId] = code;
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function generateNextClientCode(): string | null {
  const taken = new Set(Object.values(getStoredClientIds()));
  for (let n = 8001; n <= 8999; n++) {
    if (Math.floor(n / 100) % 10 === 8) continue; // skip 8800-8899
    const code = `OK/${n}`;
    if (!taken.has(code)) return code;
  }
  return null;
}
