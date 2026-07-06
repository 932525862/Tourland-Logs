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

function isValidCodeNumber(numStr: string): boolean {
  return new Set(numStr).size === numStr.length;
}

export function generateNextClientCode(): string | null {
  const taken = new Set(Object.values(getStoredClientIds()));

  // Try 4-digit codes from 8000 to 8989
  for (let n = 8000; n <= 8989; n++) {
    const numStr = String(n);
    if (isValidCodeNumber(numStr)) {
      const code = `OK/${numStr}`;
      if (!taken.has(code)) return code;
    }
  }

  // If 4-digit codes are exhausted, move on to 5-digit codes from 80000 to 99999
  for (let n = 80000; n <= 99999; n++) {
    const numStr = String(n);
    if (isValidCodeNumber(numStr)) {
      const code = `OK/${numStr}`;
      if (!taken.has(code)) return code;
    }
  }

  return null;
}

