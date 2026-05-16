// Lightweight REST + WebSocket client for the NestJS backend.
// Reads VITE_API_URL (e.g. https://api.example.com). Falls back to same origin /api.
import { Role, TaskStatus } from "../types";
import { io, Socket } from "socket.io-client";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "agency_crm_token";

let socket: Socket | null = null;
const listeners = new Set<(event: string, data: any) => void>();

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
    api<{ accessToken: string }>(
      "/auth/login",
      { method: "POST", json: { phoneNumber: login, password } },
    ),
  me: () => api<any>("/users/me").then(u => {
    // CRM returns user info directly, map it to frontend expectations
    return {
      user: {
        sub: u.id,
        role: u.role.toLowerCase() as Role,
        name: `${u.firstName} ${u.lastName}`.trim(),
        login: u.phoneNumber
      }
    };
  }),
  updateProfile: (data: { firstName?: string; lastName?: string; phoneNumber?: string }) =>
    api("/users/profile", { method: "PATCH", json: data }),
  changePassword: (data: any) =>
    api("/users/director/change-password", { method: "PATCH", json: data }),
  activateUser: (id: string) => api(`/users/${id}/activate`, { method: "POST" }),
  deactivateUser: (id: string) => api(`/users/${id}/deactivate`, { method: "POST" }),

  // employees -> /users/employees
  employees: () => api<any[]>("/users/employees").then(list => list.map(e => ({
    ...e,
    phone: e.phoneNumber,
    login: e.phoneNumber,
    isActive: e.isActive
  }))),

  // categories -> /departments
  categories: () => api<any[]>("/departments").then(list => list.map(c => ({
    id: c.id,
    name: c.name,
    isArchive: c.isArchive
  }))),

  // forms -> /forms
  forms: () => api<any[]>("/forms").then(list => list.map(f => ({
    id: f.id,
    title: f.title,
    targetCategoryId: f.targetDepartmentId,
    fields: f.fields,
    createdAt: f.createdAt
  }))),
  createForm: (data: any) => api("/forms", {
    method: "POST",
    json: {
      title: data.title,
      targetDepartmentId: data.targetCategoryId,
      fields: data.fields
    }
  }),
  updateForm: (id: string, data: any) => api(`/forms/${id}`, {
    method: "PATCH",
    json: {
      title: data.title,
      targetDepartmentId: data.targetCategoryId,
      fields: data.fields
    }
  }),
  deleteForm: (id: string) => api(`/forms/${id}`, { method: "DELETE" }),
  createEmployee: (data: any) => {
    return api("/users/employees", { 
      method: "POST", 
      json: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || data.phone,
        password: data.password
      } 
    });
  },
  updateEmployee: (id: string, data: any) => {
    return api(`/users/employees/${id}`, { 
      method: "PATCH", 
      json: { 
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || data.phone,
        password: data.password,
        isActive: data.isActive
      } 
    });
  },
  deleteEmployee: (id: string) => api(`/users/${id}/deactivate`, { method: "POST" }),

  createCategory: (data: any) => api("/departments", { method: "POST", json: data }),
  updateCategory: (id: string, name: string) => api(`/departments/${id}`, { method: "PATCH", json: { name } }),
  toggleArchiveCategory: (id: string) => api(`/departments/${id}/archive`, { method: "PATCH" }),
  deleteCategory: (id: string) => api(`/departments/${id}`, { method: "DELETE" }),

  // forms
  publicForm: (id: string) => api<any>(`/forms/public/${id}`),

  // clients
  clients: (q: { categoryId?: string; stage?: string } = {}) => {
    const params: any = {};
    if (q.categoryId) params.departmentId = q.categoryId;
    if (q.stage) params.stage = q.stage;
    const sp = new URLSearchParams(params).toString();
    return api<any[]>(`/clients${sp ? `?${sp}` : ""}`).then(list => list.map(c => ({
      ...c,
      name: c.fullName,
      phone: c.phoneNumber,
      categoryId: c.departmentId,
      sale: {
        status: c.saleStatus.toLowerCase(),
        totalAmount: c.saleTotalAmount,
        payments: c.payments || [],
        nextPaymentAt: c.nextPaymentAt,
        soldAt: c.soldAt
      }
    })));
  },
  client: (id: string) => api<any>(`/clients/${id}`).then(c => ({
    ...c,
    name: c.fullName,
    phone: c.phoneNumber,
    categoryId: c.departmentId,
    sale: {
      status: c.saleStatus.toLowerCase(),
      totalAmount: c.saleTotalAmount,
      payments: c.payments || [],
      nextPaymentAt: c.nextPaymentAt,
      soldAt: c.soldAt
    }
  })),
  createClient: (data: any) => api("/clients", { 
    method: "POST", 
    json: { 
      fullName: data.name || data.fullName,
      phoneNumber: data.phone || data.phoneNumber,
      departmentId: data.categoryId || data.departmentId,
      description: data.description || ""
    } 
  }),
  updateClient: (id: string, data: any) => api(`/clients/${id}`, { 
    method: "PATCH", 
    json: {
      fullName: data.name || data.fullName,
      phoneNumber: data.phone || data.phoneNumber,
      departmentId: data.categoryId || data.departmentId,
      ...data
    }
  }),
  deleteClient: (id: string) => api(`/clients/${id}`, { method: "DELETE" }),
  callStart: (id: string) => Promise.resolve(), // Not supported in current CRM backend
  callEnd: (id: string, remindAt?: string) => Promise.resolve(), // Not supported in current CRM backend
  addNote: (id: string, text: string) => api(`/clients/${id}/notes`, { method: "POST", json: { text } }),
  addPayment: (id: string, amount: number) => api(`/clients/${id}/payments`, { method: "POST", json: { amount } }),
  setSale: (id: string, data: any) => api(`/clients/${id}/sale`, { method: "PATCH", json: data }),

  // attendance
  attendance: (q: { employeeId?: string; date?: string } = {}) => {
    const sp = new URLSearchParams(q as Record<string, string>).toString();
    return api<any[]>(`/attendance${sp ? `?${sp}` : ""}`).then(list => list.map(a => ({
      ...a,
      employeeName: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : "Unknown",
      photo: a.checkInPhoto || a.photo,
      checkOutPhoto: a.checkOutPhoto,
    })));
  },
  myAttendance: () => {
    return api<any[]>("/attendance/my").then(list => list.map(a => ({
      ...a,
      employeeName: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : "Unknown",
      photo: a.checkInPhoto || a.photo,
      checkOutPhoto: a.checkOutPhoto,
    })));
  },
  checkIn: (photo?: string) => api("/attendance/check-in", { method: "POST", json: { photo } }),
  checkOut: (id: string, photo?: string) =>
    api(`/attendance/check-out`, { method: "POST", json: { photo } }),

  tasks: (role: Role) => {
    const mapTask = (t: any) => {
      const template = t.template || t;
      const rawStatus = (t.status || "TODO").toUpperCase();
      
      return {
        id: t.id,
        title: template.title || "Untitled",
        description: template.description || "",
        assignedTo: t.assignedTo,
        notifyAt: template.notifyAt || "9:00 AM",
        startDate: template.startDate || "",
        endDate: template.endDate || "",
        status: (rawStatus === "TODO" 
          ? "new" 
          : rawStatus === "PENDING"
            ? "done"
            : rawStatus === "DONE"
              ? "approved"
              : rawStatus.toLowerCase()) as TaskStatus,
        createdAt: t.createdAt,
        seenByEmployee: true,
        seenByDirector: true,
      };
    };
    const path = role === "director" ? "/tasks/director/dashboard" : "/tasks/employee/me";
    return api<any[]>(path).then(list => (Array.isArray(list) ? list.map(mapTask) : []));
  },
  createTask: (data: { 
    title: string; 
    description: string; 
    assignedTo: string; 
    notifyAt: string; 
    startDate: string; 
    endDate: string 
  }) => api("/tasks/template", { 
    method: "POST", 
    json: data 
  }),
  updateTask: (id: string, data: { status: string }) => api(`/tasks/${id}/status`, { 
    method: "PATCH", 
    json: { status: data.status.toLowerCase() } 
  }), 
  verifyTask: (id: string) => api(`/tasks/${id}/verify`, { method: "PATCH" }),
  rejectTask: (id: string) => api(`/tasks/${id}/reject`, { method: "PATCH" }),
  taskSeen: (id: string) => Promise.resolve(), // TODO: Not supported in current CRM backend
  deleteTask: (id: string) => Promise.resolve(), // TODO: Not supported in current CRM backend

  // archive (activity logs)
  directorArchive: () => api<any[]>("/archive/director"),
  employeeArchive: () => api<any[]>("/archive/employee"),

  // stats - Not supported in current CRM backend
  statsOverview: (employeeId?: string) => Promise.resolve({}),
  statsSales: (employeeId?: string) => Promise.resolve([]),

  // telegram - Not supported in current CRM backend
  tgSubscribers: () => Promise.resolve([]),
  tgSend: (chatId: number, text: string) => Promise.resolve(),

  // public
  publicSubmit: (formId: string, data: Record<string, any>) =>
    api(`/forms/submit/${formId}`, { method: "POST", json: { data } }),

  // WebSocket
  initSocket: (onEvent: (event: string, data: any) => void) => {
    listeners.add(onEvent);
    if (socket) return () => { listeners.delete(onEvent); };

    const token = getToken();
    const url = API_URL || window.location.origin;
    socket = io(url, {
      auth: { token },
      transports: ["websocket"]
    });

    const notify = (ev: string, data: any) => {
      listeners.forEach(l => l(ev, data));
    };

    socket.on("connect", () => console.log("WS connected"));
    socket.on("taskCreated", (data) => notify("taskCreated", data));
    socket.on("taskStatusChanged", (data) => notify("taskStatusChanged", data));
    socket.on("taskVerified", (data) => notify("taskVerified", data));
    socket.on("taskIncomplete", (data) => notify("taskIncomplete", data));

    return () => {
      listeners.delete(onEvent);
    };
  },
  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
