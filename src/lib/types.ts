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

export interface Client {
  id: string;
  formId: string;
  formTitle: string;
  categoryId: string;
  data: Record<string, string>;
  notes: ClientNote[];
  call: ClientCallStatus;
  createdAt: string;
}

export interface AppState {
  director: Director;
  employees: Employee[];
  forms: FormTemplate[];
  categories: ClientCategory[];
  clients: Client[];
}
