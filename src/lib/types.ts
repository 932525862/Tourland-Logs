export type Role = "director" | "employee";

export interface Director {
  name: string;
  login: string;
  password: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  login: string;
  password: string;
  createdAt: string;
}

export type FieldType = "text" | "phone" | "select" | "textarea";

export interface FormFieldConfig {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[]; // for select
}

export interface FormTemplate {
  id: string;
  title: string;
  fields: FormFieldConfig[];
  targetCategoryId: string;
  createdAt: string;
}

export interface ClientCategory {
  id: string;
  name: string;
  isArchive?: boolean;
}

export interface ClientNote {
  id: string;
  text: string;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export interface ClientCallStatus {
  inCallByEmployeeId?: string;
  inCallByName?: string;
  startedAt?: string;
  remindAt?: string; // ISO datetime
}

export interface PaymentEntry {
  id: string;
  amount: number;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export type SaleStatus = "none" | "partial" | "full";

export interface SaleInfo {
  status: SaleStatus;
  totalAmount?: number; // expected total
  payments: PaymentEntry[];
  nextPaymentAt?: string; // ISO datetime when remainder is due
  soldAt?: string;
  completedAt?: string; // when fully paid
  completedByName?: string;
  completedByRole?: Role;
  telegramReminderSentAt?: string; // when 1h-before reminder was sent
}

export type ClientStage = "new" | "no_answer" | "talked" | "sold";

export interface Client {
  id: string;
  formId: string;
  formTitle: string;
  categoryId: string;
  stage: ClientStage;
  data: Record<string, string>;
  notes: ClientNote[];
  call: ClientCallStatus;
  sale?: SaleInfo;
  telegramChatId?: number;
  telegramUsername?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  checkInAt: string; // ISO datetime
  checkOutAt?: string; // ISO datetime
  date: string; // YYYY-MM-DD
  photo?: string; // dataURL (check-in)
  checkOutPhoto?: string; // dataURL (check-out)
}

export type TaskStatus = "new" | "in_progress" | "done" | "approved";

export interface Task {
  id: string;
  title: string;
  description: string;
  employeeId: string;
  createdAt: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  // notification flags
  seenByEmployee?: boolean; // true after employee opened tasks page
  seenByDirector?: boolean; // true after director opened tasks page (for "done" notif)
}

export interface AppState {
  director: Director;
  employees: Employee[];
  forms: FormTemplate[];
  categories: ClientCategory[];
  clients: Client[];
  attendance: AttendanceRecord[];
  tasks: Task[];
}
