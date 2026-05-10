// Lightweight REST + WebSocket client for the NestJS backend.
// Reads VITE_API_URL (e.g. https://api.example.com). Falls back to same origin /api.

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "agency_crm_token";

export function apiBase() {
  return API_URL ? `${API_URL}/api` : "/api";
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      msg = b.message || JSON.stringify(b);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const API = {
  // auth
  login: (login: string, password: string) =>
    api<{ token: string; user: { sub: string; role: "director" | "employee"; name: string; login: string } }>(
      "/auth/login",
      { method: "POST", json: { login, password } },
    ),
  me: () => api<{ user: { sub: string; role: "director" | "employee"; name: string; login: string } }>("/auth/me"),

  // employees
  employees: () => api<any[]>("/employees"),
  createEmployee: (data: any) => api("/employees", { method: "POST", json: data }),
  updateEmployee: (id: string, data: any) => api(`/employees/${id}`, { method: "PATCH", json: data }),
  deleteEmployee: (id: string) => api(`/employees/${id}`, { method: "DELETE" }),

  // categories
  categories: () => api<any[]>("/categories"),
  createCategory: (data: any) => api("/categories", { method: "POST", json: data }),
  deleteCategory: (id: string) => api(`/categories/${id}`, { method: "DELETE" }),

  // forms
  forms: () => api<any[]>("/forms"),
  publicForm: (id: string) => api<any>(`/forms/public/${id}`),
  createForm: (data: any) => api("/forms", { method: "POST", json: data }),
  updateForm: (id: string, data: any) => api(`/forms/${id}`, { method: "PATCH", json: data }),
  deleteForm: (id: string) => api(`/forms/${id}`, { method: "DELETE" }),

  // clients
  clients: (q: { categoryId?: string; stage?: string } = {}) => {
    const sp = new URLSearchParams(q as Record<string, string>).toString();
    return api<any[]>(`/clients${sp ? `?${sp}` : ""}`);
  },
  client: (id: string) => api<any>(`/clients/${id}`),
  createClient: (data: any) => api("/clients", { method: "POST", json: data }),
  updateClient: (id: string, data: any) => api(`/clients/${id}`, { method: "PATCH", json: data }),
  deleteClient: (id: string) => api(`/clients/${id}`, { method: "DELETE" }),
  callStart: (id: string) => api(`/clients/${id}/call/start`, { method: "POST" }),
  callEnd: (id: string, remindAt?: string) => api(`/clients/${id}/call/end`, { method: "POST", json: { remindAt } }),
  addNote: (id: string, text: string) => api(`/clients/${id}/notes`, { method: "POST", json: { text } }),
  addPayment: (id: string, amount: number) => api(`/clients/${id}/payments`, { method: "POST", json: { amount } }),
  setSale: (id: string, data: any) => api(`/clients/${id}/sale`, { method: "PATCH", json: data }),

  // attendance
  attendance: (q: { employeeId?: string; date?: string } = {}) => {
    const sp = new URLSearchParams(q as Record<string, string>).toString();
    return api<any[]>(`/attendance${sp ? `?${sp}` : ""}`);
  },
  checkIn: (photo?: string) => api("/attendance/check-in", { method: "POST", json: { photo } }),
  checkOut: (id: string, photo?: string) =>
    api(`/attendance/${id}/check-out`, { method: "PATCH", json: { photo } }),

  // tasks
  tasks: () => api<any[]>("/tasks"),
  createTask: (data: any) => api("/tasks", { method: "POST", json: data }),
  updateTask: (id: string, data: any) => api(`/tasks/${id}`, { method: "PATCH", json: data }),
  taskSeen: (id: string) => api(`/tasks/${id}/seen`, { method: "PATCH" }),
  deleteTask: (id: string) => api(`/tasks/${id}`, { method: "DELETE" }),

  // stats
  statsOverview: (employeeId?: string) =>
    api<any>(`/stats/overview${employeeId ? `?employeeId=${employeeId}` : ""}`),
  statsSales: (employeeId?: string) =>
    api<any[]>(`/stats/sales${employeeId ? `?employeeId=${employeeId}` : ""}`),

  // telegram
  tgSubscribers: () => api<any[]>("/telegram/subscribers"),
  tgSend: (chatId: number, text: string) =>
    api("/telegram/send", { method: "POST", json: { chatId, text } }),

  // public
  publicSubmit: (formId: string, data: Record<string, string>) =>
    api("/public/submit", { method: "POST", json: { formId, data } }),
};
