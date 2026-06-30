const KEY = "crm_warehouses";

export type WarehouseType = "china" | "uzbekistan" | "chegara";

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  description?: string;
  type?: WarehouseType;
  createdAt: string;
}

export function getWarehouses(): Warehouse[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(warehouses: Warehouse[]): void {
  localStorage.setItem(KEY, JSON.stringify(warehouses));
}

export function createWarehouse(data: Omit<Warehouse, "id" | "createdAt">): Warehouse {
  const list = getWarehouses();
  const warehouse: Warehouse = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: data.name,
    type: data.type ?? "china",
    ...(data.address ? { address: data.address } : {}),
    ...(data.description ? { description: data.description } : {}),
  };
  list.push(warehouse);
  persist(list);
  return warehouse;
}

export function updateWarehouse(id: string, data: Partial<Pick<Warehouse, "name" | "address" | "description" | "type">>): void {
  const list = getWarehouses();
  const idx = list.findIndex(w => w.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...data };
    persist(list);
  }
}

export function deleteWarehouse(id: string): void {
  persist(getWarehouses().filter(w => w.id !== id));
}

// --- Kirim / Chiqim entries ---

export interface WarehouseEntry {
  id: string;
  warehouseId: string;
  type: "kirim" | "chiqim";
  productName: string;
  quantity: number;
  unit: string;
  note?: string;
  createdAt: string;
}

const ENTRIES_KEY = "crm_warehouse_entries";

function getAllEntries(): WarehouseEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEntries(entries: WarehouseEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function getWarehouseEntries(warehouseId: string): WarehouseEntry[] {
  return getAllEntries().filter(e => e.warehouseId === warehouseId);
}

export function addWarehouseEntry(data: Omit<WarehouseEntry, "id" | "createdAt">): WarehouseEntry {
  const all = getAllEntries();
  const entry: WarehouseEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  all.push(entry);
  persistEntries(all);
  return entry;
}

export function deleteWarehouseEntry(id: string): void {
  persistEntries(getAllEntries().filter(e => e.id !== id));
}

// --- Kirim wizard records ---

export interface KirimMeasurement {
  id: string;
  value: string;
  unit: string;
}

export interface KirimPlace {
  id: string;
  count: string;
  unit: string;
}

export interface KirimProduct {
  id: string;
  measurements: KirimMeasurement[];
  places: KirimPlace[];
  quantity: string;
  width: string;
  length: string;
  height: string;
  dimensionUnit: string;
  totalVolume: string;
  brutto: string;
  bruttoUnit: string;
  netto: string;
  nettoUnit: string;
  note: string;
}

export interface KirimAttachment {
  name: string;
  type: string;
  size: number;
}

export interface KirimRecord {
  id: string;
  warehouseId: string;
  date: string;
  clientCode: string;
  clientName: string;
  clientPhone: string;
  taskDescription: string;
  assignedEmployeeName: string;
  assignedEmployeeId?: string;
  taskDeadline?: string;
  taskNotifyAt?: string;
  taskNote: string;
  attachments: KirimAttachment[];
  taskStatus: "pending" | "completed" | "approved";
  taskApiId?: string;
  products: KirimProduct[];
  dispatchedProductIds?: string[];
  createdAt: string;
}

const KIRIM_KEY = "crm_warehouse_kirim_v2";

function getAllKirimRecords(): KirimRecord[] {
  try {
    const raw = localStorage.getItem(KIRIM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistKirim(records: KirimRecord[]): void {
  localStorage.setItem(KIRIM_KEY, JSON.stringify(records));
}

export function getKirimRecords(warehouseId: string): KirimRecord[] {
  return getAllKirimRecords().filter(r => r.warehouseId === warehouseId);
}

export function addKirimRecord(data: Omit<KirimRecord, "id" | "createdAt">): KirimRecord {
  const all = getAllKirimRecords();
  const record: KirimRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  all.push(record);
  persistKirim(all);
  return record;
}

export function deleteKirimRecord(id: string): void {
  persistKirim(getAllKirimRecords().filter(r => r.id !== id));
}

export function updateKirimStatus(id: string, status: KirimRecord["taskStatus"]): void {
  const all = getAllKirimRecords();
  const idx = all.findIndex(r => r.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], taskStatus: status };
    persistKirim(all);
  }
}

export function updateKirimProduct(kirimId: string, updatedProduct: KirimProduct): void {
  const all = getAllKirimRecords();
  const idx = all.findIndex(r => r.id === kirimId);
  if (idx !== -1) {
    all[idx] = {
      ...all[idx],
      products: all[idx].products.map(p => p.id === updatedProduct.id ? updatedProduct : p),
    };
    persistKirim(all);
  }
}

export function markProductsDispatched(kirimRecordId: string, productIds: string[]): void {
  const all = getAllKirimRecords();
  const idx = all.findIndex(r => r.id === kirimRecordId);
  if (idx !== -1) {
    const prev = all[idx].dispatchedProductIds ?? [];
    const next = Array.from(new Set([...prev, ...productIds]));
    all[idx] = { ...all[idx], dispatchedProductIds: next };
    persistKirim(all);
  }
}

export function getUndispatchedKirimForClient(warehouseId: string, clientCode: string): KirimRecord[] {
  return getAllKirimRecords()
    .filter(r => r.warehouseId === warehouseId && r.clientCode === clientCode)
    .filter(r => {
      const done = new Set(r.dispatchedProductIds ?? []);
      return r.products.some(p => !done.has(p.id));
    });
}

// --- Complex Chiqim records ---

export interface ChiqimPhoto {
  name: string;
  dataUrl: string;
}

export interface ChiqimRecord {
  id: string;
  warehouseId: string;
  date: string;
  clientCode: string;
  clientName: string;
  clientPhone: string;
  kirimRecordId: string;
  selectedProductIds: string[];
  vehicleNumber: string;
  photos: ChiqimPhoto[];
  note?: string;
  createdAt: string;
}

const CHIQIM_V2_KEY = "crm_warehouse_chiqim_v2";

function getAllChiqimV2(): ChiqimRecord[] {
  try {
    const raw = localStorage.getItem(CHIQIM_V2_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistChiqimV2(records: ChiqimRecord[]): void {
  localStorage.setItem(CHIQIM_V2_KEY, JSON.stringify(records));
}

export function getChiqimRecordsV2(warehouseId: string): ChiqimRecord[] {
  return getAllChiqimV2().filter(r => r.warehouseId === warehouseId);
}

export function addChiqimRecordV2(data: Omit<ChiqimRecord, "id" | "createdAt">): ChiqimRecord {
  const all = getAllChiqimV2();
  const record: ChiqimRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  all.push(record);
  persistChiqimV2(all);
  return record;
}

export function deleteChiqimRecordV2(id: string): void {
  persistChiqimV2(getAllChiqimV2().filter(r => r.id !== id));
}

// All chiqim records across all China warehouses
export function getAllChiqimRecordsGlobal(): ChiqimRecord[] {
  return getAllChiqimV2();
}

// All kirim records across all China warehouses
export function getAllKirimRecordsGlobal(): KirimRecord[] {
  try {
    const raw = localStorage.getItem(KIRIM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── UZB Warehouse — Truck Receipt (Fura qabul qilish) ────────

export interface ChiqimReceipt {
  id: string;
  uzbWarehouseId: string;
  vehicleNumber: string;
  // chiqimRecordId → ratio (1 = full, 0 < x < 1 = partial)
  receivedRatios: Record<string, number>;
  note?: string;
  receivedAt: string;
  createdAt: string;
}

const RECEIPT_KEY = "crm_chiqim_receipts";

function getAllReceipts(): ChiqimReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getChiqimReceipts(uzbWarehouseId: string): ChiqimReceipt[] {
  return getAllReceipts().filter(r => r.uzbWarehouseId === uzbWarehouseId);
}

export function addChiqimReceipt(data: Omit<ChiqimReceipt, "id" | "createdAt">): ChiqimReceipt {
  const all = getAllReceipts();
  const receipt: ChiqimReceipt = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  all.push(receipt);
  localStorage.setItem(RECEIPT_KEY, JSON.stringify(all));
  return receipt;
}

export function deleteChiqimReceipt(id: string): void {
  localStorage.setItem(RECEIPT_KEY, JSON.stringify(getAllReceipts().filter(r => r.id !== id)));
}

// ─── UZB Warehouse — Dispatch (Chiqim — mijoz ID bo'yicha) ────

export interface UzbDispatch {
  id: string;
  uzbWarehouseId: string;
  clientCode: string;
  clientName?: string;
  chiqimRecordIds: string[];
  ratios: Record<string, number>; // chiqimRecordId -> ratio (1 = full)
  note?: string;
  dispatchedAt: string;
  createdAt: string;
}

const UZB_DISPATCH_KEY = "crm_uzb_dispatches";

function getAllUzbDispatches(): UzbDispatch[] {
  try {
    const raw = localStorage.getItem(UZB_DISPATCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getUzbDispatches(uzbWarehouseId: string): UzbDispatch[] {
  return getAllUzbDispatches().filter(d => d.uzbWarehouseId === uzbWarehouseId);
}

export function addUzbDispatch(data: Omit<UzbDispatch, "id" | "createdAt">): UzbDispatch {
  const all = getAllUzbDispatches();
  const d: UzbDispatch = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  all.push(d);
  localStorage.setItem(UZB_DISPATCH_KEY, JSON.stringify(all));
  return d;
}

export function deleteUzbDispatch(id: string): void {
  localStorage.setItem(UZB_DISPATCH_KEY, JSON.stringify(getAllUzbDispatches().filter(d => d.id !== id)));
}

// ─── UZB Warehouse — Kirim (simple product intake) ────────────

export interface UzbKirimRecord {
  id: string;
  warehouseId: string;
  date: string;
  productName: string;
  quantity: number;
  unit: string;
  weight?: number;
  weightUnit?: string;
  note?: string;
  createdAt: string;
}

const UZB_KIRIM_KEY = "crm_warehouse_uzb_kirim";

function getAllUzbKirim(): UzbKirimRecord[] {
  try {
    const raw = localStorage.getItem(UZB_KIRIM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistUzbKirim(records: UzbKirimRecord[]): void {
  localStorage.setItem(UZB_KIRIM_KEY, JSON.stringify(records));
}

export function getUzbKirimRecords(warehouseId: string): UzbKirimRecord[] {
  return getAllUzbKirim().filter(r => r.warehouseId === warehouseId);
}

export function addUzbKirimRecord(data: Omit<UzbKirimRecord, "id" | "createdAt">): UzbKirimRecord {
  const all = getAllUzbKirim();
  const record: UzbKirimRecord = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  all.push(record);
  persistUzbKirim(all);
  return record;
}

export function deleteUzbKirimRecord(id: string): void {
  persistUzbKirim(getAllUzbKirim().filter(r => r.id !== id));
}

// ─── UZB Warehouse — Chiqim (by client ID, no fura) ──────────

export interface UzbChiqimRecord {
  id: string;
  warehouseId: string;
  date: string;
  clientCode: string;
  clientName?: string;
  clientPhone?: string;
  productName: string;
  quantity: number;
  unit: string;
  weight?: number;
  weightUnit?: string;
  note?: string;
  createdAt: string;
}

const UZB_CHIQIM_KEY = "crm_warehouse_uzb_chiqim";

function getAllUzbChiqim(): UzbChiqimRecord[] {
  try {
    const raw = localStorage.getItem(UZB_CHIQIM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistUzbChiqim(records: UzbChiqimRecord[]): void {
  localStorage.setItem(UZB_CHIQIM_KEY, JSON.stringify(records));
}

export function getUzbChiqimRecords(warehouseId: string): UzbChiqimRecord[] {
  return getAllUzbChiqim().filter(r => r.warehouseId === warehouseId);
}

export function addUzbChiqimRecord(data: Omit<UzbChiqimRecord, "id" | "createdAt">): UzbChiqimRecord {
  const all = getAllUzbChiqim();
  const record: UzbChiqimRecord = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  all.push(record);
  persistUzbChiqim(all);
  return record;
}

export function deleteUzbChiqimRecord(id: string): void {
  persistUzbChiqim(getAllUzbChiqim().filter(r => r.id !== id));
}
