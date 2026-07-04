import { api } from "./api/client";

const KEY = "crm_warehouses";

export type WarehouseType = "china" | "uzbekistan" | "chegara" | "ortaOmbor" | "ortaMijoz";

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  description?: string;
  type?: WarehouseType;
  createdAt: string;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  return await api<Warehouse[]>("/warehouses");
}

export async function createWarehouse(data: Omit<Warehouse, "id" | "createdAt">): Promise<Warehouse> {
  return await api<Warehouse>("/warehouses", {
    method: "POST",
    json: data
  });
}

export async function updateWarehouse(id: string, data: Partial<Pick<Warehouse, "name" | "address" | "description" | "type">>): Promise<void> {
  await api(`/warehouses/${id}`, {
    method: "PATCH",
    json: data
  });
}

export async function deleteWarehouse(id: string): Promise<void> {
  await api(`/warehouses/${id}`, {
    method: "DELETE"
  });
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

export interface KirimManualVolume {
  id: string;
  value: string;
}

export type VolumeMode = "places" | "quantity" | "manual";

export interface KirimProduct {
  id: string;
  measurements: KirimMeasurement[];
  places: KirimPlace[];
  quantity: string;
  width: string;
  length: string;
  height: string;
  dimensionUnit: string;
  volumeMode: VolumeMode;
  manualVolumes: KirimManualVolume[];
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
  dataUrl?: string;
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
  /** productId → nechta joy chiqarilgani (qisman chiqim uchun) */
  dispatchedPlaces?: Record<string, number>;
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

export async function getKirimRecords(warehouseId: string): Promise<KirimRecord[]> {
  return await api<KirimRecord[]>(`/warehouses/${warehouseId}/kirim`);
}

export async function addKirimRecord(data: Omit<KirimRecord, "id" | "createdAt">): Promise<KirimRecord> {
  return await api<KirimRecord>(`/warehouses/${data.warehouseId}/kirim`, {
    method: "POST",
    json: data
  });
}

export async function deleteKirimRecord(id: string): Promise<void> {
  await api(`/warehouses/kirim/${id}`, {
    method: "DELETE"
  });
}

export async function updateKirimStatus(id: string, status: KirimRecord["taskStatus"]): Promise<void> {
  await api(`/warehouses/kirim/${id}/status`, {
    method: "PATCH",
    json: { status }
  });
}

export async function updateDispatchedPlaces(
  kirimId: string,
  productId: string,
  placesCount: number,
  totalPlaces: number,
): Promise<void> {
  await api(`/warehouses/kirim/${kirimId}/dispatch-places`, {
    method: "PATCH",
    json: { productId, placesCount, totalPlaces }
  });
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

export async function markProductsDispatched(kirimRecordId: string, productIds: string[]): Promise<void> {
  await api(`/warehouses/kirim/${kirimRecordId}/mark-dispatched`, {
    method: "PATCH",
    json: { productIds }
  });
}

export async function getUndispatchedKirimForClient(warehouseId: string, clientCode: string): Promise<KirimRecord[]> {
  const records = await getKirimRecords(warehouseId);
  return records
    .filter(r => r.clientCode === clientCode)
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

export async function getChiqimRecordsV2(warehouseId: string): Promise<ChiqimRecord[]> {
  return await api<ChiqimRecord[]>(`/warehouses/${warehouseId}/chiqim`);
}

export async function addChiqimRecordV2(data: Omit<ChiqimRecord, "id" | "createdAt">): Promise<ChiqimRecord> {
  return await api<ChiqimRecord>(`/warehouses/${data.warehouseId}/chiqim`, {
    method: "POST",
    json: data
  });
}

export async function deleteChiqimRecordV2(id: string): Promise<void> {
  await api(`/warehouses/chiqim/${id}`, {
    method: "DELETE"
  });
}

// All chiqim records across all China warehouses
export async function getAllChiqimRecordsGlobal(): Promise<ChiqimRecord[]> {
  return await api<ChiqimRecord[]>('/warehouses/chiqim/all');
}

// All kirim records across all China warehouses
export async function getAllKirimRecordsGlobal(): Promise<KirimRecord[]> {
  return await api<KirimRecord[]>('/warehouses/kirim/all');
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

// ─── UZB Warehouse — Transfer (ombor → ombor) ─────────────────

export interface UzbTransfer {
  id: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  clientCode: string;
  clientName?: string;
  chiqimRecordIds: string[];
  ratios: Record<string, number>;
  note?: string;
  transferredAt: string;
  createdAt: string;
}

const UZB_TRANSFER_KEY = "crm_uzb_transfers";

function getAllUzbTransfers(): UzbTransfer[] {
  try {
    const raw = localStorage.getItem(UZB_TRANSFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getOutgoingUzbTransfers(sourceWarehouseId: string): UzbTransfer[] {
  return getAllUzbTransfers().filter(t => t.sourceWarehouseId === sourceWarehouseId);
}

export function getIncomingUzbTransfers(destWarehouseId: string): UzbTransfer[] {
  return getAllUzbTransfers().filter(t => t.destWarehouseId === destWarehouseId);
}

export function addUzbTransfer(data: Omit<UzbTransfer, "id" | "createdAt">): UzbTransfer {
  const all = getAllUzbTransfers();
  const t: UzbTransfer = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  all.push(t);
  localStorage.setItem(UZB_TRANSFER_KEY, JSON.stringify(all));
  return t;
}

export function deleteUzbTransfer(id: string): void {
  localStorage.setItem(UZB_TRANSFER_KEY, JSON.stringify(getAllUzbTransfers().filter(t => t.id !== id)));
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
