import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, Plus, Trash2, Package, ArrowDownCircle, ArrowUpCircle,
  MapPin, User, FileText, ChevronDown, ChevronUp, ExternalLink, Clock,
  Search, Truck, Camera, X as XIcon, CheckSquare, Square, Scale, IdCard,
  Building2, Globe, ImageIcon, Shield, Pencil, Check,
} from "lucide-react";
import { toast } from "sonner";
import { getStoredClientIds } from "@/lib/client-ids";
import {
  getKirimRecords,
  deleteKirimRecord,
  updateKirimProduct,
  markProductsDispatched,
  getChiqimRecordsV2,
  addChiqimRecordV2,
  deleteChiqimRecordV2,
  getAllChiqimRecordsGlobal,
  getAllKirimRecordsGlobal,
  getChiqimReceipts,
  addChiqimReceipt,
  deleteChiqimReceipt,
  getUzbKirimRecords,
  addUzbKirimRecord,
  deleteUzbKirimRecord,
  getUzbDispatches,
  addUzbDispatch,
  deleteUzbDispatch,
  type Warehouse,
  type KirimRecord,
  type KirimProduct,
  type ChiqimRecord,
  type ChiqimPhoto,
  type ChiqimReceipt,
  type UzbKirimRecord,
  type UzbDispatch,
} from "@/lib/warehouse";
import { ConfirmModal } from "@/components/ConfirmModal";
import { WarehouseKirimWizard } from "@/components/WarehouseKirimWizard";

interface Props {
  warehouse: Warehouse;
  onClose: () => void;
}

type Tab = "kirim" | "chiqim";

// Compress image to max 800px, JPEG 72%
async function compressImage(file: File): Promise<ChiqimPhoto> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(1, MAX / img.width, MAX / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name, dataUrl: canvas.toDataURL("image/jpeg", 0.72) });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function KirimStatusBadge({ status }: { status: KirimRecord["taskStatus"] }) {
  const map = {
    pending:   { label: "Kutilmoqda", cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
    completed: { label: "Tekshiruvda", cls: "bg-blue-600/10 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    approved:  { label: "Tasdiqlandi", cls: "bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
  };
  const s = map[status];
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function productSummary(p: KirimProduct): string {
  const meas = p.measurements.filter(m => m.value).map(m => m.value).join(", ");
  const weight = p.brutto ? `${p.brutto} ${p.bruttoUnit}` : "";
  return [meas, weight].filter(Boolean).join(" · ") || "Tovar";
}

export function WarehouseDetailModal({ warehouse, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("kirim");

  // ── Kirim state ──────────────────────────────────────
  const [kirimRecords, setKirimRecords] = useState<KirimRecord[]>([]);
  const [showKirimWizard, setShowKirimWizard] = useState(false);
  const [expandedKirim, setExpandedKirim] = useState<string | null>(null);
  const [deleteKirimId, setDeleteKirimId] = useState<string | null>(null);

  // ── Archive slide-over state ──────────────────────────
  const [showArchive, setShowArchive] = useState(false);

  // ── Chiqim panel state (hidden until "Chiqim qilish" clicked) ──
  const [showChiqimPanel, setShowChiqimPanel] = useState(false);

  // ── UZB Kirim panel state (hidden until "Kirim qilish" clicked) ──
  const [showUzbKirimPanel, setShowUzbKirimPanel] = useState(false);

  // Close archive + panels when tab changes
  useEffect(() => {
    setShowArchive(false);
    setShowChiqimPanel(false);
    setShowUzbKirimPanel(false);
  }, [tab]);

  // ── Inline product edit state ─────────────────────────
  const [editingProduct, setEditingProduct] = useState<{ kirimId: string; product: KirimProduct } | null>(null);

  const startEditProduct = (kirimId: string, product: KirimProduct) => {
    setEditingProduct({ kirimId, product: { ...product } });
  };

  const updEP = (patch: Partial<KirimProduct>) =>
    setEditingProduct(prev => prev ? { ...prev, product: { ...prev.product, ...patch } } : prev);

  const saveEditProduct = () => {
    if (!editingProduct) return;
    updateKirimProduct(editingProduct.kirimId, editingProduct.product);
    toast.success("Tovar yangilandi");
    setEditingProduct(null);
    refresh();
  };

  // ── Chiqim state ─────────────────────────────────────
  const [chiqimRecords, setChiqimRecords] = useState<ChiqimRecord[]>([]);
  const [deleteChiqimId, setDeleteChiqimId] = useState<string | null>(null);

  // Chiqim product selection
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  // "full" = take all, "partial" = take a portion
  const [productModes, setProductModes] = useState<Record<string, "full" | "partial">>({});
  const [partialInputs, setPartialInputs] = useState<Record<string, { qty: string; unit: string }>>({});

  // Chiqim save form
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photos, setPhotos] = useState<ChiqimPhoto[]>([]);
  const [chiqimNote, setChiqimNote] = useState("");
  const [chiqimSaving, setChiqimSaving] = useState(false);

  // ── UZB Warehouse state ───────────────────────────────
  const [uzbKirimRecords, setUzbKirimRecords] = useState<UzbKirimRecord[]>([]);

  // UZB Kirim form
  const [uzbKirimProduct, setUzbKirimProduct] = useState("");
  const [uzbKirimQty, setUzbKirimQty] = useState("");
  const [uzbKirimUnit, setUzbKirimUnit] = useState("kg");
  const [uzbKirimWeight, setUzbKirimWeight] = useState("");
  const [uzbKirimWeightUnit, setUzbKirimWeightUnit] = useState("kg");
  const [uzbKirimNote, setUzbKirimNote] = useState("");
  const [uzbKirimDate, setUzbKirimDate] = useState(new Date().toISOString().slice(0, 10));

  const [deleteUzbKirimId, setDeleteUzbKirimId] = useState<string | null>(null);

  // ── UZB Dispatch state ────────────────────────────────
  const [uzbDispatches, setUzbDispatches] = useState<UzbDispatch[]>([]);
  const [selectedDispatchClientCode, setSelectedDispatchClientCode] = useState<string | null>(null);
  const [dispatchMode, setDispatchMode] = useState<"full" | "partial">("full");
  const [dispatchPartialQty, setDispatchPartialQty] = useState("");
  const [dispatchPartialUnit, setDispatchPartialUnit] = useState("dona");
  const [dispatchNote, setDispatchNote] = useState("");
  const [dispatchSaving, setDispatchSaving] = useState(false);
  const [deleteDispatchId, setDeleteDispatchId] = useState<string | null>(null);

  // ── UZB Truck Reception state ─────────────────────────
  const [allChinaChiqim, setAllChinaChiqim] = useState<ChiqimRecord[]>([]);
  const [allChinaKirim, setAllChinaKirim] = useState<KirimRecord[]>([]);
  const [uzbReceipts, setUzbReceipts] = useState<ChiqimReceipt[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleMode, setVehicleMode] = useState<"full" | "partial">("full");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [crModes, setCrModes] = useState<Record<string, "full" | "partial">>({});
  const [crPartials, setCrPartials] = useState<Record<string, { qty: string; unit: string }>>({});
  const [receiptNote, setReceiptNote] = useState("");
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);

  const storedIds = getStoredClientIds();

  const refresh = () => {
    setKirimRecords(getKirimRecords(warehouse.id));
    setChiqimRecords(getChiqimRecordsV2(warehouse.id));
    setUzbKirimRecords(getUzbKirimRecords(warehouse.id));
    if (warehouse.type === "uzbekistan" || warehouse.type === "chegara") {
      setAllChinaChiqim(getAllChiqimRecordsGlobal());
      setAllChinaKirim(getAllKirimRecordsGlobal());
      setUzbReceipts(getChiqimReceipts(warehouse.id));
      setUzbDispatches(getUzbDispatches(warehouse.id));
    }
  };

  useEffect(() => { refresh(); }, [warehouse.id]);

  // ── Computed ──────────────────────────────────────────
  const activeKirim = kirimRecords.filter(r => {
    const done = new Set(r.dispatchedProductIds ?? []);
    return r.products.some(p => !done.has(p.id));
  });
  const archivedKirim = kirimRecords.filter(r => {
    const done = new Set(r.dispatchedProductIds ?? []);
    return r.products.every(p => done.has(p.id));
  });

  const hasSelectedProducts = selectedProductIds.size > 0;

  // All undispatched products across ALL kirim records, sorted FIFO (oldest first)
  const allUndispatched = useMemo(() => {
    return [...kirimRecords]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .flatMap(r => {
        const done = new Set(r.dispatchedProductIds ?? []);
        return r.products
          .filter(p => !done.has(p.id))
          .map(p => ({ product: p, kirimRecord: r }));
      });
  }, [kirimRecords]);

  // product id → { product, kirimRecord }
  const allProductMap = useMemo(() => {
    const map: Record<string, { product: KirimProduct; kirimRecord: KirimRecord }> = {};
    kirimRecords.forEach(r => r.products.forEach(p => { map[p.id] = { product: p, kirimRecord: r }; }));
    return map;
  }, [kirimRecords]);

  // Running calculator totals
  const chiqimTotals = useMemo(() => {
    let totalQty = 0, totalPlaces = 0, totalVolume = 0;
    for (const pid of selectedProductIds) {
      const entry = allProductMap[pid];
      if (!entry) continue;
      const { product } = entry;
      const mode = productModes[pid] ?? "full";
      let ratio = 1;
      if (mode === "partial") {
        const inp = partialInputs[pid];
        const entered = parseFloat(inp?.qty || "0");
        const total = parseFloat(product.quantity || "1") || 1;
        if (entered > 0) ratio = Math.min(1, entered / total);
      }
      totalQty    += (parseFloat(product.quantity)    || 0) * ratio;
      totalPlaces += product.places.reduce((s, pl) => s + (parseFloat(pl.count) || 0), 0) * ratio;
      totalVolume += (parseFloat(product.totalVolume) || 0) * ratio;
    }
    return {
      qty:    Math.round(totalQty    * 100) / 100,
      places: Math.round(totalPlaces * 100) / 100,
      volume: Math.round(totalVolume * 1000) / 1000,
    };
  }, [selectedProductIds, productModes, partialInputs, allProductMap]);

  // ── UZB Truck Reception computed ─────────────────────
  const receivedChiqimIds = useMemo(
    () => new Set(uzbReceipts.flatMap(r => Object.keys(r.receivedRatios))),
    [uzbReceipts]
  );

  // Group active (unreceived) chiqim records by vehicle, FIFO
  const activeTrucks = useMemo(() => {
    const byVehicle: Record<string, ChiqimRecord[]> = {};
    [...allChinaChiqim]
      .filter(cr => !receivedChiqimIds.has(cr.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(cr => {
        if (!byVehicle[cr.vehicleNumber]) byVehicle[cr.vehicleNumber] = [];
        byVehicle[cr.vehicleNumber].push(cr);
      });
    return byVehicle;
  }, [allChinaChiqim, receivedChiqimIds]);

  const activeTruckList = useMemo(
    () => Object.entries(activeTrucks).sort(
      (a, b) => new Date(a[1][0]?.createdAt ?? "").getTime() - new Date(b[1][0]?.createdAt ?? "").getTime()
    ),
    [activeTrucks]
  );

  const selectedTruckChiqims = useMemo(
    () => selectedVehicle ? (activeTrucks[selectedVehicle] ?? []) : [],
    [selectedVehicle, activeTrucks]
  );

  // Product lookup map from all china kirim records
  const globalProductMap = useMemo(() => {
    const map: Record<string, KirimProduct> = {};
    allChinaKirim.forEach(r => r.products.forEach(p => { map[p.id] = p; }));
    return map;
  }, [allChinaKirim]);

  // Calculator totals for current truck selection
  const receiptTotals = useMemo(() => {
    let clients = 0, products = 0, qty = 0, places = 0, volume = 0;
    const eligible = vehicleMode === "full"
      ? selectedTruckChiqims
      : selectedTruckChiqims.filter(cr => selectedClientIds.has(cr.id));
    for (const cr of eligible) {
      const mode = vehicleMode === "full" ? "full" : (crModes[cr.id] ?? "full");
      let ratio = 1;
      if (mode === "partial") {
        const inp = crPartials[cr.id];
        const entered = parseFloat(inp?.qty || "0");
        const totalBrutto = cr.selectedProductIds.reduce((s, pid) => {
          const p = globalProductMap[pid];
          return s + (parseFloat(p?.quantity || "0") || 0);
        }, 0) || cr.selectedProductIds.length || 1;
        if (entered > 0) ratio = Math.min(1, entered / totalBrutto);
      }
      clients += 1;
      products += Math.round(cr.selectedProductIds.length * ratio);
      for (const pid of cr.selectedProductIds) {
        const p = globalProductMap[pid];
        if (p) {
          qty    += (parseFloat(p.quantity)    || 0) * ratio;
          places += p.places.reduce((s, pl) => s + (parseFloat(pl.count) || 0), 0) * ratio;
          volume += (parseFloat(p.totalVolume) || 0) * ratio;
        }
      }
    }
    return {
      clients,
      products,
      qty:    Math.round(qty    * 100) / 100,
      places: Math.round(places * 100) / 100,
      volume: Math.round(volume * 1000) / 1000,
    };
  }, [selectedTruckChiqims, vehicleMode, selectedClientIds, crModes, crPartials, globalProductMap]);

  // ── UZB Dispatch computed ─────────────────────────────
  const uzbDispatchedIds = useMemo(
    () => new Set(uzbDispatches.flatMap(d => d.chiqimRecordIds)),
    [uzbDispatches]
  );

  // Clients who have received products not yet dispatched from this UZB warehouse
  const activeUzbClients = useMemo(() => {
    const byClient: Record<string, { records: ChiqimRecord[]; clientName: string }> = {};
    allChinaChiqim
      .filter(cr => receivedChiqimIds.has(cr.id) && !uzbDispatchedIds.has(cr.id))
      .forEach(cr => {
        if (!byClient[cr.clientCode]) byClient[cr.clientCode] = { records: [], clientName: cr.clientName || "" };
        byClient[cr.clientCode].records.push(cr);
      });
    return byClient;
  }, [allChinaChiqim, receivedChiqimIds, uzbDispatchedIds]);

  const activeUzbClientList = useMemo(() => Object.entries(activeUzbClients), [activeUzbClients]);

  const selectedClientActiveRecords = useMemo(
    () => selectedDispatchClientCode ? (activeUzbClients[selectedDispatchClientCode]?.records ?? []) : [],
    [selectedDispatchClientCode, activeUzbClients]
  );

  const selectedClientTotalQty = useMemo(() => {
    let total = 0;
    for (const cr of selectedClientActiveRecords) {
      for (const pid of cr.selectedProductIds) {
        total += (parseFloat(globalProductMap[pid]?.quantity || "0") || 0);
      }
    }
    return total || selectedClientActiveRecords.reduce((s, cr) => s + cr.selectedProductIds.length, 0) || 1;
  }, [selectedClientActiveRecords, globalProductMap]);

  const dispatchRatio = useMemo(() => {
    if (dispatchMode === "full") return 1;
    const entered = parseFloat(dispatchPartialQty || "0");
    return entered > 0 ? Math.min(1, entered / selectedClientTotalQty) : 0;
  }, [dispatchMode, dispatchPartialQty, selectedClientTotalQty]);

  const dispatchTotals = useMemo(() => {
    let products = 0, qty = 0, places = 0, volume = 0;
    for (const cr of selectedClientActiveRecords) {
      products += cr.selectedProductIds.length;
      for (const pid of cr.selectedProductIds) {
        const p = globalProductMap[pid];
        if (p) {
          qty    += (parseFloat(p.quantity)    || 0);
          places += p.places.reduce((s, pl) => s + (parseFloat(pl.count) || 0), 0);
          volume += (parseFloat(p.totalVolume) || 0);
        }
      }
    }
    return {
      products: Math.round(products * dispatchRatio),
      qty:    Math.round(qty    * dispatchRatio * 100) / 100,
      places: Math.round(places * dispatchRatio * 100) / 100,
      volume: Math.round(volume * dispatchRatio * 1000) / 1000,
    };
  }, [selectedClientActiveRecords, dispatchRatio, globalProductMap]);

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return iso; }
  };
  const fmtDateTime = (iso: string) => {
    try { return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        setProductModes(m => { const n = { ...m }; delete n[productId]; return n; });
        setPartialInputs(m => { const n = { ...m }; delete n[productId]; return n; });
      } else {
        next.add(productId);
        setProductModes(m => ({ ...m, [productId]: "full" }));
      }
      return next;
    });
  };

  const setProductMode = (productId: string, mode: "full" | "partial") => {
    setProductModes(m => ({ ...m, [productId]: mode }));
    if (mode === "full") {
      setPartialInputs(m => { const n = { ...m }; delete n[productId]; return n; });
    } else {
      setPartialInputs(m => ({ ...m, [productId]: m[productId] ?? { qty: "", unit: "dona" } }));
    }
  };

  // ── Photos ────────────────────────────────────────────
  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 20 - photos.length;
    if (remaining <= 0) { toast.error("Maksimal 20 ta rasm"); e.target.value = ""; return; }
    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) toast.warning(`Faqat ${remaining} ta rasm qo'shildi`);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setPhotos(prev => [...prev, ...compressed]);
    e.target.value = "";
  };

  // ── Save chiqim ───────────────────────────────────────
  const handleSaveChiqim = async () => {
    if (!hasSelectedProducts) { toast.error("Kamida bitta tovar tanlang"); return; }
    if (!vehicleNumber.trim()) { toast.error("Avtomobil raqamini kiriting"); return; }

    // Validate partial inputs
    for (const pid of selectedProductIds) {
      if ((productModes[pid] ?? "full") === "partial") {
        const inp = partialInputs[pid];
        if (!inp?.qty || parseFloat(inp.qty) <= 0) {
          toast.error("Qisman tanlangan tovar uchun miqdor kiriting");
          return;
        }
      }
    }

    setChiqimSaving(true);
    try {
      // Group selected products by their parent kirim record
      const groups: Record<string, string[]> = {};
      for (const pid of selectedProductIds) {
        const entry = allProductMap[pid];
        if (entry) {
          const rid = entry.kirimRecord.id;
          if (!groups[rid]) groups[rid] = [];
          groups[rid].push(pid);
        }
      }

      for (const [kirimRecordId, productIds] of Object.entries(groups)) {
        const kr = allProductMap[productIds[0]]?.kirimRecord;
        addChiqimRecordV2({
          warehouseId: warehouse.id,
          date: new Date().toISOString().slice(0, 10),
          clientCode: kr?.clientCode ?? "",
          clientName: kr?.clientName ?? "",
          clientPhone: kr?.clientPhone ?? "",
          kirimRecordId,
          selectedProductIds: productIds,
          vehicleNumber: vehicleNumber.trim(),
          photos,
          note: chiqimNote.trim() || undefined,
        });
        markProductsDispatched(kirimRecordId, productIds);
      }

      toast.success("Chiqim saqlandi va tovarlar arxivlandi");

      setSelectedProductIds(new Set());
      setProductModes({});
      setPartialInputs({});
      setVehicleNumber(""); setPhotos([]); setChiqimNote("");
      setShowChiqimPanel(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setChiqimSaving(false);
    }
  };

  const handleDeleteKirim = () => {
    if (!deleteKirimId) return;
    deleteKirimRecord(deleteKirimId);
    toast.success("Kirim yozuvi o'chirildi");
    setDeleteKirimId(null);
    refresh();
  };

  const handleDeleteChiqim = () => {
    if (!deleteChiqimId) return;
    deleteChiqimRecordV2(deleteChiqimId);
    toast.success("O'chirildi");
    setDeleteChiqimId(null);
    refresh();
  };

  // ── UZB Truck Reception handlers ──────────────────────
  const handleSelectVehicle = (v: string) => {
    const reset = () => { setVehicleMode("full"); setSelectedClientIds(new Set()); setCrModes({}); setCrPartials({}); };
    if (selectedVehicle === v) { setSelectedVehicle(null); reset(); }
    else { setSelectedVehicle(v); reset(); }
  };

  const handleSetVehicleMode = (mode: "full" | "partial") => {
    setVehicleMode(mode);
    if (mode === "partial") {
      setSelectedClientIds(new Set(selectedTruckChiqims.map(cr => cr.id)));
    } else {
      setSelectedClientIds(new Set());
    }
    setCrModes({}); setCrPartials({});
  };

  const toggleClientId = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setCrModes(m => { const n = { ...m }; delete n[id]; return n; }); setCrPartials(m => { const n = { ...m }; delete n[id]; return n; }); }
      else next.add(id);
      return next;
    });
  };

  const handleSaveReceipt = () => {
    if (!selectedVehicle) { toast.error("Fura tanlang"); return; }
    const eligible = vehicleMode === "full"
      ? selectedTruckChiqims
      : selectedTruckChiqims.filter(cr => selectedClientIds.has(cr.id));
    if (vehicleMode === "partial" && eligible.length === 0) { toast.error("Kamida bir mijozni tanlang"); return; }
    if (vehicleMode === "partial") {
      for (const cr of eligible) {
        if ((crModes[cr.id] ?? "full") === "partial") {
          const inp = crPartials[cr.id];
          if (!inp?.qty || parseFloat(inp.qty) <= 0) {
            toast.error(`${cr.clientName || cr.clientCode} uchun miqdor kiriting`);
            return;
          }
        }
      }
    }
    setReceiptSaving(true);
    try {
      const receivedRatios: Record<string, number> = {};
      for (const cr of eligible) {
        const mode = vehicleMode === "full" ? "full" : (crModes[cr.id] ?? "full");
        if (mode === "full") {
          receivedRatios[cr.id] = 1;
        } else {
          const inp = crPartials[cr.id];
          const entered = parseFloat(inp?.qty || "0");
          const totalBrutto = cr.selectedProductIds.reduce((s, pid) => {
            const p = globalProductMap[pid];
            return s + (parseFloat(p?.quantity || "0") || 0);
          }, 0) || cr.selectedProductIds.length || 1;
          receivedRatios[cr.id] = Math.min(1, entered / totalBrutto);
        }
      }
      addChiqimReceipt({
        uzbWarehouseId: warehouse.id,
        vehicleNumber: selectedVehicle,
        receivedRatios,
        note: receiptNote.trim() || undefined,
        receivedAt: new Date().toISOString().slice(0, 10),
      });
      toast.success("Fura qabul qilindi");
      setSelectedVehicle(null); setVehicleMode("full"); setSelectedClientIds(new Set()); setCrModes({}); setCrPartials({}); setReceiptNote("");
      setShowUzbKirimPanel(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik");
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleDeleteReceipt = () => {
    if (!deleteReceiptId) return;
    deleteChiqimReceipt(deleteReceiptId);
    toast.success("O'chirildi");
    setDeleteReceiptId(null);
    refresh();
  };

  // ── UZB Dispatch handlers ─────────────────────────────
  const handleSelectDispatchClient = (clientCode: string) => {
    if (selectedDispatchClientCode === clientCode) {
      setSelectedDispatchClientCode(null);
    } else {
      setSelectedDispatchClientCode(clientCode);
      setDispatchMode("full"); setDispatchPartialQty(""); setDispatchPartialUnit("dona");
    }
  };

  const handleSaveDispatch = () => {
    if (!selectedDispatchClientCode) { toast.error("Mijoz tanlang"); return; }
    if (dispatchMode === "partial" && parseFloat(dispatchPartialQty || "0") <= 0) {
      toast.error("Miqdor kiriting"); return;
    }
    setDispatchSaving(true);
    try {
      const ratios: Record<string, number> = {};
      for (const cr of selectedClientActiveRecords) ratios[cr.id] = dispatchRatio;
      addUzbDispatch({
        uzbWarehouseId: warehouse.id,
        clientCode: selectedDispatchClientCode,
        clientName: activeUzbClients[selectedDispatchClientCode]?.clientName || selectedDispatchClientCode,
        chiqimRecordIds: selectedClientActiveRecords.map(cr => cr.id),
        ratios,
        note: dispatchNote.trim() || undefined,
        dispatchedAt: new Date().toISOString().slice(0, 10),
      });
      toast.success("Chiqim saqlandi");
      setSelectedDispatchClientCode(null);
      setDispatchMode("full"); setDispatchPartialQty(""); setDispatchPartialUnit("dona"); setDispatchNote("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik");
    } finally {
      setDispatchSaving(false);
    }
  };

  const handleDeleteDispatch = () => {
    if (!deleteDispatchId) return;
    deleteUzbDispatch(deleteDispatchId);
    toast.success("O'chirildi");
    setDeleteDispatchId(null);
    refresh();
  };

  // ── UZB handlers ──────────────────────────────────────
  const handleUzbKirimSave = () => {
    if (!uzbKirimProduct.trim()) { toast.error("Tovar nomini kiriting"); return; }
    if (!uzbKirimQty || parseFloat(uzbKirimQty) <= 0) { toast.error("Miqdorni kiriting"); return; }
    addUzbKirimRecord({
      warehouseId: warehouse.id,
      date: uzbKirimDate,
      productName: uzbKirimProduct.trim(),
      quantity: parseFloat(uzbKirimQty),
      unit: uzbKirimUnit,
      weight: uzbKirimWeight ? parseFloat(uzbKirimWeight) : undefined,
      weightUnit: uzbKirimWeight ? uzbKirimWeightUnit : undefined,
      note: uzbKirimNote.trim() || undefined,
    });
    setUzbKirimProduct(""); setUzbKirimQty(""); setUzbKirimWeight(""); setUzbKirimNote("");
    toast.success("Kirim qo'shildi");
    refresh();
  };

  const handleDeleteUzbKirim = () => {
    if (!deleteUzbKirimId) return;
    deleteUzbKirimRecord(deleteUzbKirimId);
    toast.success("O'chirildi");
    setDeleteUzbKirimId(null);
    refresh();
  };

  // ══════════════════════════════════════════════════════
  // ── KIRIM card ────────────────────────────────────────
  const renderKirimRecord = (record: KirimRecord) => {
    const dispatched = new Set(record.dispatchedProductIds ?? []);
    const activeProducts = record.products.filter(p => !dispatched.has(p.id));
    const isFullyDispatched = activeProducts.length === 0;
    const expanded = expandedKirim === record.id;

    return (
      <div key={record.id} className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${isFullyDispatched ? "opacity-60" : ""}`}>
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors select-none"
          onClick={() => setExpandedKirim(expanded ? null : record.id)}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isFullyDispatched ? "bg-secondary" : "bg-blue-600/10 dark:bg-blue-900/30"
          }`}>
            <ArrowDownCircle className={`w-4.5 h-4.5 ${isFullyDispatched ? "text-muted-foreground" : "text-blue-600"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-foreground">
                {record.products.length} ta tovar
              </span>
              {isFullyDispatched
                ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Arxivlandi</span>
                : <KirimStatusBadge status={record.taskStatus} />
              }
              {!isFullyDispatched && dispatched.size > 0 && (
                <span className="text-[10px] font-bold text-slate-500">({dispatched.size} ta chiqarildi)</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{record.date}</span>
              {record.assignedEmployeeName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />{record.assignedEmployeeName}
                </span>
              )}
              {record.taskDeadline && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{fmtDate(record.taskDeadline)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setDeleteKirimId(record.id); }}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3 bg-secondary/10">
            {record.taskDescription && (
              <div className="bg-card rounded-xl p-3 border border-border/50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Topshiriq</p>
                <p className="text-sm text-foreground">{record.taskDescription}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {record.assignedEmployeeName && (
                    <p className="text-xs text-primary font-bold flex items-center gap-1"><User className="w-3 h-3" />{record.assignedEmployeeName}</p>
                  )}
                  {record.taskDeadline && (
                    <p className="text-xs text-slate-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3" />Muddat: {fmtDate(record.taskDeadline)}</p>
                  )}
                  {record.taskApiId && (
                    <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><ExternalLink className="w-3 h-3" />Topshiriq tizimida</span>
                  )}
                </div>
              </div>
            )}

            {record.attachments.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Hujjatlar</p>
                <div className="space-y-1">
                  {record.attachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-card rounded-lg px-3 py-2 border border-border/50">
                      <FileText className="w-3 h-3 text-primary/60 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
                Tovarlar ({record.products.length} ta)
              </p>
              <div className="space-y-2">
                {record.products.map((p, i) => {
                  const isDispatched = dispatched.has(p.id);
                  const isEditing = editingProduct?.kirimId === record.id && editingProduct?.product.id === p.id;
                  const ep = isEditing ? editingProduct!.product : null;

                  return (
                    <div key={p.id} className={`bg-card rounded-xl border overflow-hidden ${isDispatched ? "border-blue-200 dark:border-blue-800 opacity-60" : "border-border/50"}`}>
                      {/* Header row */}
                      <div className="flex items-center justify-between px-3 pt-3 pb-1">
                        <p className="text-xs font-black text-foreground">Tovar {i + 1}</p>
                        <div className="flex items-center gap-1">
                          {isDispatched && (
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                              <ArrowUpCircle className="w-3 h-3" /> Chiqarildi
                            </span>
                          )}
                          {!isEditing ? (
                            <button
                              onClick={() => startEditProduct(record.id, p)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={saveEditProduct}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black hover:bg-blue-700 transition-colors"
                              >
                                <Check className="w-3 h-3" /> Saqlash
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* View mode */}
                      {!isEditing && (
                        <div className="px-3 pb-3 space-y-1">
                          {p.measurements.some(m => m.value) && (
                            <p className="text-xs text-muted-foreground">Tovar: {p.measurements.filter(m => m.value).map(m => m.value).join(", ")}</p>
                          )}
                          {p.places.some(pl => pl.count) && (
                            <p className="text-xs text-muted-foreground">Joylar: {p.places.filter(pl => pl.count).map(pl => `${pl.count} ${pl.unit}`).join(", ")}</p>
                          )}
                          {p.quantity && <p className="text-xs text-muted-foreground">Soni: {p.quantity}</p>}
                          {p.brutto && <p className="text-xs text-muted-foreground">Brutto: <span className="font-bold">{p.brutto} {p.bruttoUnit}</span>{p.netto ? ` | Netto: ${p.netto} ${p.nettoUnit}` : ""}</p>}
                          {p.note && <p className="text-xs text-muted-foreground italic">{p.note}</p>}
                        </div>
                      )}

                      {/* Edit mode */}
                      {isEditing && ep && (
                        <div className="px-3 pb-3 pt-2 space-y-2 bg-blue-50/40 dark:bg-blue-950/10 border-t border-blue-100">
                          {/* Tovar nomi */}
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">Tovar nomi</p>
                            <input
                              value={ep.measurements[0]?.value ?? ""}
                              onChange={e => updEP({ measurements: ep.measurements.map((m, idx) => idx === 0 ? { ...m, value: e.target.value } : m) })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="Tovar nomi..."
                            />
                          </div>
                          {/* Joylar soni */}
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">Joylar soni</p>
                            <div className="flex gap-1.5">
                              <input
                                type="number" min="0"
                                value={ep.places[0]?.count ?? ""}
                                onChange={e => updEP({ places: ep.places.map((pl, idx) => idx === 0 ? { ...pl, count: e.target.value } : pl) })}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Soni"
                              />
                              <input
                                value={ep.places[0]?.unit ?? "joy"}
                                onChange={e => updEP({ places: ep.places.map((pl, idx) => idx === 0 ? { ...pl, unit: e.target.value } : pl) })}
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="joy"
                              />
                            </div>
                          </div>
                          {/* Tovar soni */}
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">Tovar soni</p>
                            <input
                              type="number" min="0"
                              value={ep.quantity}
                              onChange={e => updEP({ quantity: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="0"
                            />
                          </div>
                          {/* Brutto / Netto */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">Brutto</p>
                              <div className="flex gap-1">
                                <input
                                  type="number" min="0"
                                  value={ep.brutto}
                                  onChange={e => updEP({ brutto: e.target.value })}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  placeholder="0"
                                />
                                <select
                                  value={ep.bruttoUnit}
                                  onChange={e => updEP({ bruttoUnit: e.target.value })}
                                  className="w-12 px-1 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
                                >
                                  {["kg","g","tonna","pound"].map(u => <option key={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">Netto</p>
                              <div className="flex gap-1">
                                <input
                                  type="number" min="0"
                                  value={ep.netto}
                                  onChange={e => updEP({ netto: e.target.value })}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  placeholder="0"
                                />
                                <select
                                  value={ep.nettoUnit}
                                  onChange={e => updEP({ nettoUnit: e.target.value })}
                                  className="w-12 px-1 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
                                >
                                  {["kg","g","tonna","pound"].map(u => <option key={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                          {/* Izoh */}
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">Izoh</p>
                            <input
                              value={ep.note}
                              onChange={e => updEP({ note: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="Ixtiyoriy..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-right">{fmtDateTime(record.createdAt)}</p>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════
  // ── UZB Warehouse view ────────────────────────────────
  if (warehouse.type === "uzbekistan") {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-foreground truncate">{warehouse.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 shrink-0">Chiqaruvchi</span>
              </div>
              {warehouse.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{warehouse.address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setTab("kirim")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all ${
                tab === "kirim" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-secondary/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Kirim
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${tab === "kirim" ? "bg-white/20" : "bg-blue-600/10 text-blue-600"}`}>
                {activeTruckList.length}
              </span>
            </button>
            <button
              onClick={() => setTab("chiqim")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all ${
                tab === "chiqim" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-secondary/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Chiqim
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${tab === "chiqim" ? "bg-white/20" : "bg-blue-600/10 text-blue-600"}`}>
                {activeUzbClientList.length}
              </span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

            {/* ── UZB KIRIM tab — single column + archive slide-over ── */}
            {tab === "kirim" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

                {/* Active trucks (full width) */}
                <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${showUzbKirimPanel ? "bg-blue-500" : "bg-gray-300"}`} />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-700">Kirim</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-black border border-blue-100">
                        {activeTruckList.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {showUzbKirimPanel ? (
                        <button
                          onClick={() => { setShowUzbKirimPanel(false); setSelectedVehicle(null); setVehicleMode("full"); setSelectedClientIds(new Set()); setCrModes({}); setCrPartials({}); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-50 transition-colors"
                        >
                          Bekor
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowUzbKirimPanel(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                          disabled={activeTruckList.length === 0}
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" /> Kirim qilish
                        </button>
                      )}
                      <button
                        onClick={() => setShowArchive(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                      >
                        Arxiv ({uzbReceipts.length})
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-gray-50/50">
                    {!showUzbKirimPanel ? (
                      <div className="py-20 text-center px-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center mx-auto mb-4">
                          <Truck className="w-8 h-8 text-blue-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 mb-1">
                          {activeTruckList.length > 0 ? `${activeTruckList.length} ta fura qabul qilinishini kutmoqda` : "Kutilayotgan fura yo'q"}
                        </p>
                        {activeTruckList.length > 0 && (
                          <button
                            onClick={() => setShowUzbKirimPanel(true)}
                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
                          >
                            <ArrowDownCircle className="w-4 h-4" /> Kirim qilish
                          </button>
                        )}
                      </div>
                    ) : activeTruckList.length === 0 ? (
                      <div className="py-16 text-center px-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mx-auto mb-4">
                          <Truck className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-sm font-black text-gray-400">Kutilayotgan fura yo'q</p>
                        <p className="text-xs text-gray-300 mt-1">Xitoy omboridan chiqim qilinsin</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {activeTruckList.map(([vehicleNumber, chiqims]) => {
                          const isSelected = selectedVehicle === vehicleNumber;
                          const totalProducts = chiqims.reduce((s, cr) => s + cr.selectedProductIds.length, 0);
                          const firstDate = chiqims[0]?.date ?? "";
                          const allPhotos = chiqims.flatMap(cr => cr.photos ?? []);
                          return (
                            <div key={vehicleNumber}
                              className={`rounded-2xl border-2 transition-all overflow-hidden ${
                                isSelected
                                  ? "border-blue-300 bg-white shadow-md shadow-blue-50"
                                  : "border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm"
                              }`}
                            >
                              {/* Truck header row */}
                              <button
                                onClick={() => handleSelectVehicle(vehicleNumber)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                                }`}>
                                  <Truck className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-black font-mono transition-colors ${isSelected ? "text-blue-600" : "text-gray-800"}`}>
                                    {vehicleNumber}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {chiqims.length} mijoz · {totalProducts} tovar · {firstDate}
                                  </p>
                                </div>
                                {isSelected
                                  ? <CheckSquare className="w-5 h-5 text-blue-400 shrink-0" />
                                  : <Square className="w-5 h-5 text-gray-300 shrink-0" />
                                }
                              </button>

                              {/* Expanded: photos + info + mode buttons + client list */}
                              {isSelected && (
                                <div className="border-t-2 border-blue-50 bg-blue-50/40 px-4 pt-3 pb-4 space-y-3">

                                  {/* Vehicle info row */}
                                  <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-blue-100 px-3 py-2">
                                    <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fura raqami</p>
                                      <p className="text-sm font-black text-gray-800 font-mono">{vehicleNumber}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sana</p>
                                      <p className="text-sm font-bold text-gray-700">{firstDate}</p>
                                    </div>
                                  </div>

                                  {/* Photos */}
                                  {allPhotos.length > 0 ? (
                                    <div>
                                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> Rasmlar ({allPhotos.length} ta)
                                      </p>
                                      <div className="flex gap-2 overflow-x-auto pb-1">
                                        {allPhotos.map((photo, idx) => (
                                          <img
                                            key={idx}
                                            src={photo.dataUrl}
                                            alt={photo.name}
                                            className="w-20 h-20 rounded-xl object-cover shrink-0 border-2 border-blue-100 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={e => { e.stopPropagation(); window.open(photo.dataUrl, "_blank"); }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-gray-300 bg-white rounded-xl border-2 border-gray-100 px-3 py-2">
                                      <ImageIcon className="w-4 h-4" />
                                      <p className="text-[10px] font-bold">Rasm yuklanmagan</p>
                                    </div>
                                  )}

                                  {/* Barchasi / Bir qismi toggle */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSetVehicleMode("full")}
                                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                                        vehicleMode === "full"
                                          ? "bg-blue-50 border-blue-300 text-blue-600"
                                          : "bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500"
                                      }`}
                                    >
                                      Barchasi
                                    </button>
                                    <button
                                      onClick={() => handleSetVehicleMode("partial")}
                                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                                        vehicleMode === "partial"
                                          ? "bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-100"
                                          : "bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500"
                                      }`}
                                    >
                                      Bir qismi
                                    </button>
                                  </div>

                                  {/* Client list with checkboxes (visible in partial mode) */}
                                  {vehicleMode === "partial" && (
                                    <div className="space-y-2">
                                      {chiqims.map(cr => {
                                        const isClientSelected = selectedClientIds.has(cr.id);
                                        const cMode = crModes[cr.id] ?? "full";
                                        const cPart = crPartials[cr.id];
                                        return (
                                          <div key={cr.id}
                                            className={`rounded-xl border-2 transition-all overflow-hidden ${
                                              isClientSelected
                                                ? "border-blue-200 bg-white shadow-sm"
                                                : "border-gray-200 bg-gray-50/80 opacity-60"
                                            }`}
                                          >
                                            {/* Client checkbox header */}
                                            <button
                                              onClick={() => toggleClientId(cr.id)}
                                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                                            >
                                              {isClientSelected
                                                ? <CheckSquare className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                                                : <Square className="w-4.5 h-4.5 text-gray-300 shrink-0" />
                                              }
                                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${
                                                isClientSelected ? "text-blue-600 bg-blue-50" : "text-gray-400 bg-gray-100"
                                              }`}>
                                                {cr.clientCode}
                                              </span>
                                              <span className="text-[10px] text-gray-500 font-medium flex-1 truncate">
                                                {cr.clientName || cr.clientCode}
                                              </span>
                                              <span className={`text-[10px] font-bold shrink-0 ${isClientSelected ? "text-blue-400" : "text-gray-300"}`}>
                                                {cr.selectedProductIds.length} tovar
                                              </span>
                                            </button>

                                            {/* Barchasi / Bir qismi for selected client */}
                                            {isClientSelected && (
                                              <div className="border-t-2 border-blue-50 px-3 py-2.5 space-y-2 bg-blue-50/30">
                                                <div className="flex gap-1.5">
                                                  <button
                                                    onClick={() => setCrModes(m => ({ ...m, [cr.id]: "full" }))}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border-2 transition-all ${
                                                      cMode === "full"
                                                        ? "bg-blue-50 border-blue-200 text-blue-600"
                                                        : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"
                                                    }`}
                                                  >
                                                    Barchasi
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setCrModes(m => ({ ...m, [cr.id]: "partial" }));
                                                      setCrPartials(m => ({ ...m, [cr.id]: m[cr.id] ?? { qty: "", unit: "dona" } }));
                                                    }}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border-2 transition-all ${
                                                      cMode === "partial"
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"
                                                    }`}
                                                  >
                                                    Bir qismi
                                                  </button>
                                                </div>
                                                {cMode === "partial" && (
                                                  <div className="flex gap-1.5">
                                                    <input
                                                      type="number"
                                                      value={cPart?.qty ?? ""}
                                                      onChange={e => setCrPartials(m => ({
                                                        ...m,
                                                        [cr.id]: { qty: e.target.value, unit: m[cr.id]?.unit ?? "dona" }
                                                      }))}
                                                      placeholder={String(cr.selectedProductIds.length)}
                                                      className="flex-1 px-2.5 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:border-blue-200"
                                                    />
                                                    <select
                                                      value={cPart?.unit ?? "dona"}
                                                      onChange={e => setCrPartials(m => ({
                                                        ...m,
                                                        [cr.id]: { qty: m[cr.id]?.qty ?? "", unit: e.target.value }
                                                      }))}
                                                      className="px-2 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:border-blue-200"
                                                    >
                                                      {["dona", "kg", "g", "t", "qop", "korobka"].map(u => <option key={u}>{u}</option>)}
                                                    </select>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Calculator */}
                    {selectedVehicle && (
                      <div className="mx-3 mb-3 p-4 bg-white border-2 border-blue-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">
                          Jami hisob · {receiptTotals.clients} mijoz
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { val: receiptTotals.products, label: "Tovar" },
                            { val: receiptTotals.qty,      label: "Paket" },
                            { val: receiptTotals.places,   label: "Joy" },
                            { val: receiptTotals.volume,   label: "m³" },
                          ].map(({ val, label }) => (
                            <div key={label} className="text-center bg-blue-50 rounded-xl py-2.5 border border-blue-100">
                              <p className="text-base font-black text-blue-700">{val || "—"}</p>
                              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Note + Save */}
                    {selectedVehicle && (
                      <div className="mx-3 mb-4 space-y-2">
                        <input
                          value={receiptNote}
                          onChange={e => setReceiptNote(e.target.value)}
                          placeholder="Izoh (ixtiyoriy)..."
                          className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 placeholder:text-gray-300"
                        />
                        <button
                          onClick={handleSaveReceipt}
                          disabled={receiptSaving}
                          className="w-full py-3 rounded-xl bg-blue-500 text-white font-black text-sm hover:bg-blue-600 disabled:opacity-50 transition-all shadow-sm shadow-blue-100"
                        >
                          {receiptSaving ? "Saqlanmoqda..." : "Furani qabul qilish"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Archive slide-over */}
                {showArchive && (
                  <div className="absolute inset-0 z-10 flex">
                    <button
                      className="flex-1 bg-foreground/10"
                      onClick={() => setShowArchive(false)}
                    />
                    <div className="w-80 bg-card border-l border-border flex flex-col shadow-2xl">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">Arxiv</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                            {uzbReceipts.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowArchive(false)}
                          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {uzbReceipts.length === 0 ? (
                          <div className="py-14 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                              <ArrowDownCircle className="w-7 h-7 text-muted-foreground/20" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground/50">Arxiv bo'sh</p>
                            <p className="text-xs text-muted-foreground/40 mt-1">Qabul qilingan furalar bu yerda</p>
                          </div>
                        ) : (
                          [...uzbReceipts].reverse().map(receipt => {
                            const clientCount = Object.keys(receipt.receivedRatios).length;
                            return (
                              <div key={receipt.id} className="bg-card rounded-xl border border-border p-3 group">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                      <Truck className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-foreground font-mono">{receipt.vehicleNumber}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {clientCount} mijoz · {receipt.receivedAt}
                                      </p>
                                      {Object.entries(receipt.receivedRatios).map(([crId, ratio]) => {
                                        const cr = allChinaChiqim.find(c => c.id === crId);
                                        return cr ? (
                                          <div key={crId} className="flex items-center gap-1 mt-0.5">
                                            <span className="text-[9px] font-bold text-blue-600 font-mono">{cr.clientCode}</span>
                                            {ratio < 1 && (
                                              <span className="text-[9px] text-gray-400">({Math.round(ratio * 100)}%)</span>
                                            )}
                                          </div>
                                        ) : null;
                                      })}
                                      {receipt.note && (
                                        <p className="text-[10px] text-muted-foreground italic mt-0.5 truncate">{receipt.note}</p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setDeleteReceiptId(receipt.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── UZB CHIQIM tab (Mijoz ID bo'yicha) ── */}
            {tab === "chiqim" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

                {/* Active clients (full width) */}
                <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-700">Faol mijozlar</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-black border border-blue-100">
                        {activeUzbClientList.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowArchive(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                    >
                      Arxiv ({uzbDispatches.length})
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-gray-50/50">
                    {activeUzbClientList.length === 0 ? (
                      <div className="py-16 text-center px-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mx-auto mb-4">
                          <IdCard className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">Chiqarilishi kerak bo'lgan tovar yo'q</p>
                        <p className="text-xs text-gray-300 mt-1">Avval fura orqali tovar qabul qiling</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {activeUzbClientList.map(([clientCode, { records, clientName }]) => {
                          const isSelected = selectedDispatchClientCode === clientCode;
                          const productCount = records.reduce((s, cr) => s + cr.selectedProductIds.length, 0);
                          return (
                            <div key={clientCode}
                              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all cursor-pointer select-none ${
                                isSelected ? "border-blue-500 shadow-blue-100" : "border-gray-100 hover:border-blue-200"
                              }`}
                              onClick={() => handleSelectDispatchClient(clientCode)}
                            >
                              {/* Client card header */}
                              <div className="flex items-center gap-3 px-3.5 py-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
                                }`}>
                                  <IdCard className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-gray-800 font-mono">{clientCode}</p>
                                  {clientName && clientName !== clientCode && (
                                    <p className="text-xs text-gray-400 truncate">{clientName}</p>
                                  )}
                                  <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                                    {records.length} ta yuk · {productCount} ta tovar
                                  </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                  isSelected ? "border-blue-500 bg-blue-500" : "border-gray-200"
                                }`}>
                                  {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                </div>
                              </div>

                              {/* Expanded panel */}
                              {isSelected && (
                                <div className="border-t-2 border-blue-50 bg-blue-50/30 px-3.5 py-3 space-y-3">

                                  {/* Mode buttons */}
                                  <div className="flex gap-2">
                                    {(["full", "partial"] as const).map(m => (
                                      <button key={m}
                                        onClick={e => { e.stopPropagation(); setDispatchMode(m); if (m === "full") setDispatchPartialQty(""); }}
                                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                                          dispatchMode === m
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                            : "bg-white border-2 border-gray-100 text-gray-600 hover:border-blue-200"
                                        }`}
                                      >
                                        {m === "full" ? "Barchasi" : "Bir qismi"}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Partial qty input */}
                                  {dispatchMode === "partial" && (
                                    <div onClick={e => e.stopPropagation()}>
                                      <label className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Miqdor</label>
                                      <div className="flex gap-2 mt-1">
                                        <input
                                          type="number"
                                          value={dispatchPartialQty}
                                          onChange={e => setDispatchPartialQty(e.target.value)}
                                          placeholder="0"
                                          className="flex-1 px-3 py-2 rounded-xl border-2 border-blue-100 bg-white text-sm font-bold focus:outline-none focus:border-blue-400"
                                        />
                                        <select
                                          value={dispatchPartialUnit}
                                          onChange={e => setDispatchPartialUnit(e.target.value)}
                                          onClick={e => e.stopPropagation()}
                                          className="px-2 py-2 rounded-xl border-2 border-blue-100 bg-white text-sm focus:outline-none"
                                        >
                                          {["dona","kg","g","t","l","m","qop","korobka"].map(u => <option key={u}>{u}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                  )}

                                  {/* Calculator */}
                                  {(dispatchMode === "full" || parseFloat(dispatchPartialQty || "0") > 0) && (
                                    <div className="bg-white rounded-xl border-2 border-blue-100 p-3" onClick={e => e.stopPropagation()}>
                                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-2">Hisob-kitob</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { label: "Tovar", val: dispatchTotals.products },
                                          { label: "Miqdor", val: dispatchTotals.qty },
                                          { label: "Joy soni", val: dispatchTotals.places },
                                          { label: "Kuba (m³)", val: dispatchTotals.volume },
                                        ].map(({ label, val }) => (
                                          <div key={label} className="bg-blue-50 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-gray-500 font-bold">{label}</p>
                                            <p className="text-base font-black text-blue-700">{val}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Note */}
                                  <div onClick={e => e.stopPropagation()}>
                                    <label className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Izoh</label>
                                    <input
                                      value={dispatchNote}
                                      onChange={e => setDispatchNote(e.target.value)}
                                      placeholder="Ixtiyoriy..."
                                      className="w-full mt-1 px-3 py-2 rounded-xl border-2 border-blue-100 bg-white text-sm focus:outline-none focus:border-blue-400"
                                    />
                                  </div>

                                  {/* Save */}
                                  <button
                                    onClick={e => { e.stopPropagation(); handleSaveDispatch(); }}
                                    disabled={dispatchSaving || (dispatchMode === "partial" && parseFloat(dispatchPartialQty || "0") <= 0)}
                                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <ArrowUpCircle className="w-4 h-4" />
                                    {dispatchSaving ? "Saqlanmoqda..." : "Chiqimni saqlash"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Archive slide-over */}
                {showArchive && (
                  <div className="absolute inset-0 z-10 flex">
                    <button
                      className="flex-1 bg-foreground/10"
                      onClick={() => setShowArchive(false)}
                    />
                    <div className="w-80 bg-card border-l border-border flex flex-col shadow-2xl">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">Arxiv</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                            {uzbDispatches.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowArchive(false)}
                          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {uzbDispatches.length === 0 ? (
                          <div className="py-16 text-center px-4">
                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mx-auto mb-4">
                              <ArrowUpCircle className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-sm font-bold text-gray-400">Chiqimlar yo'q</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...uzbDispatches].reverse().map(d => {
                              const avgRatio = Object.values(d.ratios).length
                                ? Object.values(d.ratios).reduce((a, b) => a + b, 0) / Object.values(d.ratios).length
                                : 1;
                              const isPart = avgRatio < 0.99;
                              return (
                                <div key={d.id} className="bg-white rounded-2xl border-2 border-gray-100 p-3 shadow-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg font-mono">
                                          {d.clientCode}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPart ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
                                          {isPart ? "Bir qismi" : "Barchasi"}
                                        </span>
                                      </div>
                                      {d.clientName && d.clientName !== d.clientCode && (
                                        <p className="text-xs text-gray-500 font-medium mb-1">{d.clientName}</p>
                                      )}
                                      <p className="text-[10px] text-gray-400">{d.chiqimRecordIds.length} ta yuk</p>
                                      {d.note && <p className="text-xs text-gray-500 mt-1">{d.note}</p>}
                                      <p className="text-[10px] text-gray-300 mt-1">{fmtDate(d.dispatchedAt)} · {fmtDateTime(d.createdAt)}</p>
                                    </div>
                                    <button onClick={() => setDeleteDispatchId(d.id)}
                                      className="p-1.5 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        <ConfirmModal isOpen={!!deleteUzbKirimId} onClose={() => setDeleteUzbKirimId(null)} onConfirm={handleDeleteUzbKirim}
          title="Kirimni o'chirish" description="Ushbu kirim yozuvini o'chirishni tasdiqlaysizmi?" confirmLabel="O'chirish" tone="destructive" />
        <ConfirmModal isOpen={!!deleteDispatchId} onClose={() => setDeleteDispatchId(null)} onConfirm={handleDeleteDispatch}
          title="Chiqimni o'chirish" description="Ushbu chiqim yozuvini o'chirishni tasdiqlaysizmi?" confirmLabel="O'chirish" tone="destructive" />
        <ConfirmModal isOpen={!!deleteReceiptId} onClose={() => setDeleteReceiptId(null)} onConfirm={handleDeleteReceipt}
          title="Qabul yozuvini o'chirish" description="Ushbu fura qabul yozuvini o'chirishni tasdiqlaysizmi?" confirmLabel="O'chirish" tone="destructive" />
      </>
    );
  }

  // ══════════════════════════════════════════════════════
  // chegara: truck reception for kirim, FIFO dispatch for chiqim (same as china)
  const isChegara = warehouse.type === "chegara";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card shrink-0">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isChegara ? "bg-violet-600/10" : "bg-orange-500/10"}`}>
            {isChegara ? <Shield className="w-5 h-5 text-violet-600" /> : <Globe className="w-5 h-5 text-orange-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-foreground truncate">{warehouse.name}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isChegara ? "bg-violet-600/10 text-violet-600" : "bg-orange-500/10 text-orange-500"}`}>
                {isChegara ? "Chegara" : "Xitoy"}
              </span>
            </div>
            {warehouse.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{warehouse.address}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setTab("kirim")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all ${
              tab === "kirim"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Kirim
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
              tab === "kirim" ? "bg-white/20 text-white" : "bg-blue-600/10 text-blue-600"
            }`}>
              {isChegara ? activeTruckList.length : activeKirim.length}
            </span>
          </button>
          <button
            onClick={() => setTab("chiqim")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all ${
              tab === "chiqim"
                ? "bg-slate-800 text-white shadow-md shadow-slate-800/20"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Chiqim
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
              tab === "chiqim" ? "bg-white/20 text-white" : "bg-slate-500/10 text-slate-600"
            }`}>
              {chiqimRecords.length}
            </span>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

          {/* ════ KIRIM tab — chegara: truck reception (same as UZB) ════ */}
          {tab === "kirim" && isChegara && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {/* Active trucks (full width) */}
              <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-700">Kelayotgan furalar</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 font-black border border-violet-100">
                      {activeTruckList.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowArchive(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                  >
                    Arxiv ({uzbReceipts.length})
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50/50">
                  {activeTruckList.length === 0 ? (
                    <div className="py-16 text-center px-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-400">Kutilayotgan fura yo'q</p>
                      <p className="text-xs text-gray-300 mt-1">Xitoy omboridan chiqim qilinsin</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {activeTruckList.map(([vehicleNumber, chiqims]) => {
                        const isSelected = selectedVehicle === vehicleNumber;
                        const totalProducts = chiqims.reduce((s, cr) => s + cr.selectedProductIds.length, 0);
                        const firstDate = chiqims[0]?.date ?? "";
                        const allPhotos = chiqims.flatMap(cr => cr.photos ?? []);
                        return (
                          <div key={vehicleNumber}
                            className={`rounded-2xl border-2 transition-all overflow-hidden ${
                              isSelected ? "border-violet-300 bg-white shadow-md shadow-violet-50" : "border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm"
                            }`}
                          >
                            <button onClick={() => handleSelectVehicle(vehicleNumber)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                                <Truck className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-black font-mono transition-colors ${isSelected ? "text-violet-600" : "text-gray-800"}`}>{vehicleNumber}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{chiqims.length} mijoz · {totalProducts} tovar · {firstDate}</p>
                              </div>
                              {isSelected ? <CheckSquare className="w-5 h-5 text-violet-400 shrink-0" /> : <Square className="w-5 h-5 text-gray-300 shrink-0" />}
                            </button>
                            {isSelected && (
                              <div className="border-t-2 border-violet-50 bg-violet-50/40 px-4 pt-3 pb-4 space-y-3">
                                <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-violet-100 px-3 py-2">
                                  <Truck className="w-4 h-4 text-violet-400 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fura raqami</p>
                                    <p className="text-sm font-black text-gray-800 font-mono">{vehicleNumber}</p>
                                  </div>
                                  <div className="ml-auto text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sana</p>
                                    <p className="text-sm font-bold text-gray-700">{firstDate}</p>
                                  </div>
                                </div>
                                {allPhotos.length > 0 ? (
                                  <div>
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" /> Rasmlar ({allPhotos.length} ta)
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {allPhotos.map((photo, idx) => (
                                        <img key={idx} src={photo.dataUrl} alt={photo.name}
                                          className="w-20 h-20 rounded-xl object-cover shrink-0 border-2 border-violet-100 cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={e => { e.stopPropagation(); window.open(photo.dataUrl, "_blank"); }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-300 bg-white rounded-xl border-2 border-gray-100 px-3 py-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <p className="text-[10px] font-bold">Rasm yuklanmagan</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  {(["full", "partial"] as const).map(m => (
                                    <button key={m} onClick={() => handleSetVehicleMode(m)}
                                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                                        vehicleMode === m
                                          ? m === "full" ? "bg-violet-50 border-violet-300 text-violet-600" : "bg-violet-500 border-violet-500 text-white shadow-sm"
                                          : "bg-white border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-500"
                                      }`}
                                    >{m === "full" ? "Barchasi" : "Bir qismi"}</button>
                                  ))}
                                </div>
                                {vehicleMode === "partial" && (
                                  <div className="space-y-2">
                                    {chiqims.map(cr => {
                                      const isClientSelected = selectedClientIds.has(cr.id);
                                      const cMode = crModes[cr.id] ?? "full";
                                      const cPart = crPartials[cr.id];
                                      return (
                                        <div key={cr.id} className={`rounded-xl border-2 transition-all overflow-hidden ${isClientSelected ? "border-violet-200 bg-white shadow-sm" : "border-gray-200 bg-gray-50/80 opacity-60"}`}>
                                          <button onClick={() => toggleClientId(cr.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                                            {isClientSelected ? <CheckSquare className="w-4.5 h-4.5 text-violet-400 shrink-0" /> : <Square className="w-4.5 h-4.5 text-gray-300 shrink-0" />}
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${isClientSelected ? "text-violet-600 bg-violet-50" : "text-gray-400 bg-gray-100"}`}>{cr.clientCode}</span>
                                            <span className="text-[10px] text-gray-500 font-medium flex-1 truncate">{cr.clientName || cr.clientCode}</span>
                                            <span className={`text-[10px] font-bold shrink-0 ${isClientSelected ? "text-violet-400" : "text-gray-300"}`}>{cr.selectedProductIds.length} tovar</span>
                                          </button>
                                          {isClientSelected && (
                                            <div className="border-t-2 border-violet-50 px-3 py-2.5 space-y-2 bg-violet-50/30">
                                              <div className="flex gap-1.5">
                                                {(["full", "partial"] as const).map(m => (
                                                  <button key={m}
                                                    onClick={() => { setCrModes(p => ({ ...p, [cr.id]: m })); if (m === "partial") setCrPartials(p => ({ ...p, [cr.id]: p[cr.id] ?? { qty: "", unit: "dona" } })); }}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border-2 transition-all ${cMode === m ? m === "full" ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-violet-500 border-violet-500 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-violet-200"}`}
                                                  >{m === "full" ? "Barchasi" : "Bir qismi"}</button>
                                                ))}
                                              </div>
                                              {cMode === "partial" && (
                                                <div className="flex gap-1.5">
                                                  <input type="number" value={cPart?.qty ?? ""} placeholder={String(cr.selectedProductIds.length)}
                                                    onChange={e => setCrPartials(p => ({ ...p, [cr.id]: { qty: e.target.value, unit: p[cr.id]?.unit ?? "dona" } }))}
                                                    className="flex-1 px-2.5 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:border-violet-200" />
                                                  <select value={cPart?.unit ?? "dona"}
                                                    onChange={e => setCrPartials(p => ({ ...p, [cr.id]: { qty: p[cr.id]?.qty ?? "", unit: e.target.value } }))}
                                                    className="px-2 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:border-violet-200">
                                                    {["dona","kg","g","t","qop","korobka"].map(u => <option key={u}>{u}</option>)}
                                                  </select>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedVehicle && (
                    <div className="mx-3 mb-3 p-4 bg-white border-2 border-violet-100 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-3">Jami hisob · {receiptTotals.clients} mijoz</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ val: receiptTotals.products, label: "Tovar" }, { val: receiptTotals.qty, label: "Paket" }, { val: receiptTotals.places, label: "Joy" }, { val: receiptTotals.volume, label: "m³" }]
                          .map(({ val, label }) => (
                            <div key={label} className="text-center bg-violet-50 rounded-xl py-2.5 border border-violet-100">
                              <p className="text-base font-black text-violet-700">{val || "—"}</p>
                              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {selectedVehicle && (
                    <div className="mx-3 mb-4 space-y-2">
                      <input value={receiptNote} onChange={e => setReceiptNote(e.target.value)}
                        placeholder="Izoh (ixtiyoriy)..."
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-violet-300 placeholder:text-gray-300" />
                      <button onClick={handleSaveReceipt} disabled={receiptSaving}
                        className="w-full py-3 rounded-xl bg-violet-600 text-white font-black text-sm hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-violet-100">
                        {receiptSaving ? "Saqlanmoqda..." : "Furani qabul qilish"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Archive slide-over */}
              {showArchive && (
                <div className="absolute inset-0 z-10 flex">
                  <button
                    className="flex-1 bg-foreground/10"
                    onClick={() => setShowArchive(false)}
                  />
                  <div className="w-80 bg-card border-l border-border flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">Arxiv</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                          {uzbReceipts.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowArchive(false)}
                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {uzbReceipts.length === 0 ? (
                        <div className="py-14 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                            <ArrowDownCircle className="w-7 h-7 text-muted-foreground/20" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground/50">Arxiv bo'sh</p>
                        </div>
                      ) : (
                        [...uzbReceipts].reverse().map(receipt => {
                          const clientCount = Object.keys(receipt.receivedRatios).length;
                          return (
                            <div key={receipt.id} className="bg-white rounded-2xl border-2 border-gray-100 p-3 shadow-sm group">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                    <Truck className="w-4 h-4 text-violet-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground font-mono">{receipt.vehicleNumber}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{clientCount} mijoz · {receipt.receivedAt}</p>
                                    {Object.entries(receipt.receivedRatios).map(([crId, ratio]) => {
                                      const cr = allChinaChiqim.find(c => c.id === crId);
                                      return cr ? (
                                        <div key={crId} className="flex items-center gap-1 mt-0.5">
                                          <span className="text-[9px] font-bold text-violet-600 font-mono">{cr.clientCode}</span>
                                          {ratio < 1 && <span className="text-[9px] text-gray-400">({Math.round(ratio * 100)}%)</span>}
                                        </div>
                                      ) : null;
                                    })}
                                    {receipt.note && <p className="text-[10px] text-muted-foreground italic mt-0.5 truncate">{receipt.note}</p>}
                                  </div>
                                </div>
                                <button onClick={() => setDeleteReceiptId(receipt.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ KIRIM tab — single column + archive slide-over ════ */}
          {tab === "kirim" && !isChegara && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

              {/* Active kirim (full width) */}
              <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">Faol</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 font-bold">
                      {activeKirim.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowKirimWizard(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Yangi kirim
                    </button>
                    <button
                      onClick={() => setShowArchive(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                    >
                      Arxiv ({archivedKirim.length})
                    </button>
                  </div>
                </div>

                {/* Active kirim content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeKirim.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/5 border border-blue-600/10 flex items-center justify-center mx-auto mb-3">
                        <ArrowDownCircle className="w-7 h-7 text-blue-600/30" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground">Faol kirimlar yo'q</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">Yangi kirim qo'shing</p>
                    </div>
                  ) : (
                    [...activeKirim].reverse().map(renderKirimRecord)
                  )}
                </div>
              </div>

              {/* Archive slide-over */}
              {showArchive && (
                <div className="absolute inset-0 z-10 flex">
                  <button
                    className="flex-1 bg-foreground/10"
                    onClick={() => setShowArchive(false)}
                  />
                  <div className="w-80 bg-card border-l border-border flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">Arxiv</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                          {archivedKirim.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowArchive(false)}
                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {archivedKirim.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                            <ArrowUpCircle className="w-7 h-7 text-muted-foreground/20" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground/50">Arxiv bo'sh</p>
                          <p className="text-xs text-muted-foreground/40 mt-1">Chiqarilgan tovarlar bu yerda</p>
                        </div>
                      ) : (
                        [...archivedKirim].reverse().map(renderKirimRecord)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ CHIQIM tab — single column + archive slide-over ════ */}
          {tab === "chiqim" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

              {/* Active products (full width) */}
              <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${showChiqimPanel ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">Chiqim</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 font-bold">
                      {allUndispatched.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {showChiqimPanel && selectedProductIds.size > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-600/10 px-2 py-0.5 rounded-md">
                        {selectedProductIds.size} tanlandi
                      </span>
                    )}
                    {showChiqimPanel ? (
                      <button
                        onClick={() => { setShowChiqimPanel(false); setSelectedProductIds(new Set()); setProductModes({}); setPartialInputs({}); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-secondary transition-colors"
                      >
                        Bekor
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowChiqimPanel(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                        disabled={allUndispatched.length === 0}
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Chiqim qilish
                      </button>
                    )}
                    <button
                      onClick={() => setShowArchive(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                    >
                      Arxiv ({chiqimRecords.length})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {!showChiqimPanel ? (
                    <div className="py-20 text-center px-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600/5 border-2 border-blue-600/10 flex items-center justify-center mx-auto mb-4">
                        <ArrowUpCircle className="w-8 h-8 text-blue-600/30" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground mb-1">
                        {allUndispatched.length > 0 ? `${allUndispatched.length} ta tovar chiqimga tayyor` : "Chiqarilishi kerak bo'lgan tovar yo'q"}
                      </p>
                      {allUndispatched.length > 0 && (
                        <button
                          onClick={() => setShowChiqimPanel(true)}
                          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
                        >
                          <ArrowUpCircle className="w-4 h-4" /> Chiqim qilish
                        </button>
                      )}
                    </div>
                  ) : allUndispatched.length === 0 ? (
                    <div className="py-14 text-center px-4">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                        <Package className="w-7 h-7 text-muted-foreground/20" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground">Faol tovarlar yo'q</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">Kirim qo'shing</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {allUndispatched.map(({ product: p, kirimRecord: kr }, idx) => {
                        const isSelected = selectedProductIds.has(p.id);
                        const mode = productModes[p.id] ?? "full";
                        const partial = partialInputs[p.id];
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-600/5"
                                : "border-border bg-card hover:border-slate-400/40"
                            }`}
                          >
                            {/* Product header row */}
                            <button
                              onClick={() => toggleProduct(p.id)}
                              className="w-full flex items-start gap-2.5 p-3 text-left"
                            >
                              <div className={`w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center ${isSelected ? "text-blue-600" : "text-muted-foreground"}`}>
                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase">#{idx + 1}</span>
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-600/10 px-1.5 py-0.5 rounded font-mono">
                                    {kr.clientCode}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/60">{kr.date}</span>
                                </div>
                                <p className="text-xs font-bold text-foreground mt-0.5">{productSummary(p)}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                  {p.quantity && (
                                    <span className="text-[10px] text-muted-foreground">Soni: <strong>{p.quantity}</strong></span>
                                  )}
                                  {p.places.some(pl => pl.count) && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Joy: <strong>{p.places.filter(pl => pl.count).map(pl => `${pl.count} ${pl.unit}`).join(", ")}</strong>
                                    </span>
                                  )}
                                  {p.totalVolume && (
                                    <span className="text-[10px] text-muted-foreground">Vol: <strong>{p.totalVolume} m³</strong></span>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Selection mode buttons (shown when selected) */}
                            {isSelected && (
                              <div className="px-3 pb-3 space-y-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setProductMode(p.id, "full")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                      mode === "full"
                                        ? "bg-blue-600/10 border-blue-600 text-blue-700"
                                        : "bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                                  >
                                    Barchasi
                                  </button>
                                  <button
                                    onClick={() => setProductMode(p.id, "partial")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                      mode === "partial"
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                                  >
                                    Bir qismi
                                  </button>
                                </div>
                                {mode === "partial" && (
                                  <div className="flex gap-1.5">
                                    <input
                                      type="number"
                                      value={partial?.qty ?? ""}
                                      onChange={e => setPartialInputs(m => ({
                                        ...m,
                                        [p.id]: { qty: e.target.value, unit: m[p.id]?.unit ?? "dona" }
                                      }))}
                                      placeholder={p.quantity || "0"}
                                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/30 focus:border-blue-600"
                                    />
                                    <select
                                      value={partial?.unit ?? "dona"}
                                      onChange={e => setPartialInputs(m => ({
                                        ...m,
                                        [p.id]: { qty: m[p.id]?.qty ?? "", unit: e.target.value }
                                      }))}
                                      className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
                                    >
                                      {["dona", "kg", "g", "t", "qop", "korobka"].map(u => (
                                        <option key={u}>{u}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Calculator ── */}
                  {selectedProductIds.size > 0 && (
                    <div className="mx-3 mb-3 p-3 bg-blue-600/8 border border-blue-600/20 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-2">
                        Jami hisob · {selectedProductIds.size} ta tovar
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-white rounded-lg py-2 border border-blue-600/10">
                          <p className="text-lg font-black text-blue-700">{chiqimTotals.qty || "—"}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Paket soni</p>
                        </div>
                        <div className="text-center bg-white rounded-lg py-2 border border-blue-600/10">
                          <p className="text-lg font-black text-blue-700">{chiqimTotals.places || "—"}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Joy soni</p>
                        </div>
                        <div className="text-center bg-white rounded-lg py-2 border border-blue-600/10">
                          <p className="text-lg font-black text-blue-700">{chiqimTotals.volume || "—"}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Kuba (m³)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Vehicle / Photos / Note / Save ── */}
                  {hasSelectedProducts && (
                    <div className="mx-3 mb-3 bg-white rounded-xl border border-blue-600/15 p-3 space-y-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Chiqim ma'lumotlari</p>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                          <Truck className="w-3 h-3" /> Avtomobil raqami <span className="text-destructive">*</span>
                        </label>
                        <input
                          value={vehicleNumber}
                          onChange={e => setVehicleNumber(e.target.value)}
                          placeholder="01 A 123 AA"
                          className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/30 focus:border-blue-600 uppercase font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                          <Camera className="w-3 h-3" /> Rasmlar
                          <span className="ml-1 text-[10px] px-1 py-0.5 rounded font-bold bg-secondary text-muted-foreground">
                            {photos.length}/20
                          </span>
                        </label>
                        {photos.length < 20 && (
                          <label className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-blue-200 bg-blue-600/5 hover:border-blue-400 text-xs text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
                            <Camera className="w-3.5 h-3.5" /> Rasm qo'shish
                            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                          </label>
                        )}
                        {photos.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                            {photos.map((ph, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                <img src={ph.dataUrl} alt={ph.name} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                                  className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors"
                                >
                                  <XIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">Izoh</label>
                        <textarea
                          value={chiqimNote}
                          onChange={e => setChiqimNote(e.target.value)}
                          placeholder="Qo'shimcha..."
                          rows={2}
                          className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/30 focus:border-blue-600 resize-none"
                        />
                      </div>

                      <button
                        onClick={handleSaveChiqim}
                        disabled={chiqimSaving}
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {chiqimSaving ? "Saqlanmoqda..." : `Chiqimni saqlash (${selectedProductIds.size} ta tovar)`}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Archive slide-over */}
              {showArchive && (
                <div className="absolute inset-0 z-10 flex">
                  <button
                    className="flex-1 bg-foreground/10"
                    onClick={() => setShowArchive(false)}
                  />
                  <div className="w-80 bg-card border-l border-border flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">Arxiv</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                          {chiqimRecords.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowArchive(false)}
                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {chiqimRecords.length === 0 ? (
                        <div className="py-14 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                            <ArrowUpCircle className="w-7 h-7 text-muted-foreground/20" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground/50">Arxiv bo'sh</p>
                          <p className="text-xs text-muted-foreground/40 mt-1">Chiqarilgan tovarlar bu yerda</p>
                        </div>
                      ) : (
                        [...chiqimRecords].reverse().map(record => (
                          <div key={record.id} className="bg-card rounded-xl border border-border p-3 group">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  <ArrowUpCircle className="w-4 h-4 text-slate-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-foreground truncate">
                                    {record.clientName || record.clientCode}
                                  </p>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5">
                                      <Truck className="w-2.5 h-2.5" />{record.vehicleNumber}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {record.selectedProductIds.length} tovar
                                    </span>
                                    {record.photos.length > 0 && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Camera className="w-2.5 h-2.5" />{record.photos.length}
                                      </span>
                                    )}
                                  </div>
                                  {record.note && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">{record.note}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{fmtDateTime(record.createdAt)}</p>
                                  {record.photos.length > 0 && (
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                      {record.photos.slice(0, 4).map((ph, i) => (
                                        <img key={i} src={ph.dataUrl} alt={ph.name}
                                          className="w-8 h-8 rounded-md object-cover border border-border" />
                                      ))}
                                      {record.photos.length > 4 && (
                                        <div className="w-8 h-8 rounded-md border border-border bg-secondary flex items-center justify-center text-[9px] font-black text-muted-foreground">
                                          +{record.photos.length - 4}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setDeleteChiqimId(record.id)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteKirimId}
        onClose={() => setDeleteKirimId(null)}
        onConfirm={handleDeleteKirim}
        title="Kirimni o'chirish"
        description="Ushbu kirim yozuvini o'chirishni tasdiqlaysizmi?"
        confirmLabel="O'chirish"
        tone="destructive"
      />
      <ConfirmModal
        isOpen={!!deleteChiqimId}
        onClose={() => setDeleteChiqimId(null)}
        onConfirm={handleDeleteChiqim}
        title="Chiqimni o'chirish"
        description="Ushbu chiqim yozuvini o'chirishni tasdiqlaysizmi?"
        confirmLabel="O'chirish"
        tone="destructive"
      />

      {isChegara && (
        <ConfirmModal isOpen={!!deleteReceiptId} onClose={() => setDeleteReceiptId(null)} onConfirm={handleDeleteReceipt}
          title="Qabul yozuvini o'chirish" description="Ushbu fura qabul yozuvini o'chirishni tasdiqlaysizmi?" confirmLabel="O'chirish" tone="destructive" />
      )}

      {!isChegara && showKirimWizard && (
        <WarehouseKirimWizard
          warehouseId={warehouse.id}
          onClose={() => setShowKirimWizard(false)}
          onSaved={() => { setShowKirimWizard(false); refresh(); }}
        />
      )}
    </>
  );
}
