import { useState, useEffect } from "react";
import { X, Phone, MessageSquare, Bell, ArrowRightLeft, Trash2, ShoppingCart, CheckCircle2, Wallet, Send, RefreshCw } from "lucide-react";
import type { Client, AppState, PaymentEntry, SaleInfo, ClientStage } from "@/lib/types";
import { toast } from "sonner";
import { API } from "@/lib/api/client";
import { ConfirmModal } from "@/components/ConfirmModal";

const STAGE_LABELS: Record<ClientStage, string> = {
  new: "Yangi",
  no_answer: "Ko'tarmadi",
  talked: "Gaplashildi",
  sold: "Sotildi",
};

interface Props {
  client: Client;
  state: AppState;
  onClose: () => void;
  onRefresh: () => void;
  viewerRole: "director" | "employee";
  viewerName: string;
  viewerId?: string;
  enableCallActions?: boolean;
}

export function ClientDetailDialog({
  client,
  onClose,
  onRefresh,
  viewerRole,
  viewerName,
  viewerId,
  enableCallActions = false,
}: Props) {
  const [noteText, setNoteText] = useState("");
  const [moveStage, setMoveStage] = useState<ClientStage>(client.stage);
  const [reminderDate, setReminderDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sale state
  const sale: SaleInfo = client.sale ?? { status: "none", payments: [] };
  const totalPaid = sale.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = sale.totalAmount ? Math.max(0, sale.totalAmount - totalPaid) : 0;

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<"choose" | "full" | "partial">("choose");
  const [fullAmount, setFullAmount] = useState("");
  const [partialTotal, setPartialTotal] = useState(sale.totalAmount?.toString() ?? "");
  const [partialPaid, setPartialPaid] = useState("");
  const [partialNextDate, setPartialNextDate] = useState("");
  const [extraAmount, setExtraAmount] = useState("");

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setLoading(true);
    try {
      await API.addNote(client.id, noteText.trim());
      setNoteText("");
      toast.success("Izoh qo'shildi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async () => {
    if (moveStage === client.stage) return;
    setLoading(true);
    try {
      await API.updateClient(client.id, { stage: moveStage });
      toast.success(`"${STAGE_LABELS[moveStage]}" bosqichiga ko'chirildi`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleFullPurchase = async () => {
    const amt = parseFloat(fullAmount);
    if (!amt || amt <= 0) {
      toast.error("To'lov summasini kiriting");
      return;
    }
    setLoading(true);
    try {
      await API.setSale(client.id, {
        status: "full",
        totalAmount: amt,
        paidAmount: amt
      });
      toast.success("Sotildi (to'liq)");
      setShowPurchase(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialPurchase = async () => {
    const total = parseFloat(partialTotal);
    const paid = parseFloat(partialPaid);
    if (!total || total <= 0 || !paid || paid <= 0) {
      toast.error("To'liq summa va to'langan summani kiriting");
      return;
    }
    if (paid >= total) {
      toast.error("To'langan summa to'liq summadan kichik bo'lishi kerak");
      return;
    }
    if (!partialNextDate) {
      toast.error("Keyingi to'lov sanasini kiriting");
      return;
    }
    setLoading(true);
    try {
      await API.setSale(client.id, {
        status: "partial",
        totalAmount: total,
        paidAmount: paid,
        nextPaymentAt: new Date(partialNextDate).toISOString()
      });
      toast.success("Sotildi (bir qismi)");
      setShowPurchase(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(extraAmount);
    if (!amt || amt <= 0) {
      toast.error("Summa kiriting");
      return;
    }
    setLoading(true);
    try {
      await API.addPayment(client.id, amt);
      setExtraAmount("");
      toast.success("To'lov qo'shildi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    setLoading(true);
    try {
      await API.setSale(client.id, { status: "full" });
      toast.success("To'lov yakunlandi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await API.deleteClient(client.id);
      toast.success("Mijoz o'chirildi");
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
              {client.data?.["Ism familya"] || client.name || "Mijoz"}
              {sale.status === "partial" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                  To'liq emas
                </span>
              )}
              {sale.status === "full" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sotildi
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">Bo'lim: {client.formTitle || "—"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Form data / Details */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Mijoz ma'lumotlari</h3>
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Ism familya</span>
                <span className="col-span-2 text-foreground font-medium">{client.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Tel raqam</span>
                <span className="col-span-2 text-foreground font-medium">{client.phone}</span>
              </div>
              {Object.entries(client.data || {}).map(([key, value]) => {
                if (key === "Ism familya" || key === "Tel raqam") return null;
                return (
                  <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="col-span-2 text-foreground font-medium break-words">{value || "—"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sale section */}
          <section className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sotov
            </h3>

            {sale.status === "none" && !showPurchase && (
              <button
                onClick={() => setShowPurchase(true)}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow-md"
              >
                Sotuvni rasmiylashtirish
              </button>
            )}

            {sale.status === "none" && showPurchase && purchaseMode === "choose" && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPurchaseMode("full")}
                  className="py-3 rounded-lg bg-success text-success-foreground font-medium"
                >
                  To'liq to'lov
                </button>
                <button
                  onClick={() => setPurchaseMode("partial")}
                  className="py-3 rounded-lg bg-warning text-warning-foreground font-medium"
                >
                  Bo'lib to'lash
                </button>
                <button
                  onClick={() => { setShowPurchase(false); setPurchaseMode("choose"); }}
                  className="col-span-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Bekor qilish
                </button>
              </div>
            )}

            {sale.status === "none" && purchaseMode === "full" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">To'lov summasi</label>
                <input
                  type="number"
                  value={fullAmount}
                  onChange={(e) => setFullAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
                <div className="flex gap-2">
                  <button onClick={handleFullPurchase} disabled={loading} className="flex-1 py-2 rounded-lg bg-success text-white text-sm font-medium">
                    Tasdiqlash
                  </button>
                  <button onClick={() => setPurchaseMode("choose")} className="px-3 py-2 rounded-lg border border-border text-sm">
                    Orqaga
                  </button>
                </div>
              </div>
            )}

            {sale.status === "none" && purchaseMode === "partial" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">To'liq summa</label>
                    <input type="number" value={partialTotal} onChange={(e) => setPartialTotal(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To'langan summa</label>
                    <input type="number" value={partialPaid} onChange={(e) => setPartialPaid(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Keyingi to'lov sanasi</label>
                  <input type="datetime-local" value={partialNextDate} onChange={(e) => setPartialNextDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePartialPurchase} disabled={loading} className="flex-1 py-2 rounded-lg bg-warning text-white text-sm font-medium">
                    Tasdiqlash
                  </button>
                  <button onClick={() => setPurchaseMode("choose")} className="px-3 py-2 rounded-lg border border-border text-sm">
                    Orqaga
                  </button>
                </div>
              </div>
            )}

            {sale.status !== "none" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm bg-secondary/40 rounded-lg p-3 text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Jami</div>
                    <div className="font-bold text-foreground">{sale.totalAmount?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">To'langan</div>
                    <div className="font-bold text-success">{totalPaid.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Qoldiq</div>
                    <div className="font-bold text-destructive">{remaining.toLocaleString()}</div>
                  </div>
                </div>

                {sale.status === "partial" && sale.nextPaymentAt && (
                  <div className="flex items-center gap-2 text-xs bg-warning/10 text-warning-foreground rounded-lg p-2 border border-warning/20">
                    <Bell className="w-3.5 h-3.5" /> Keyingi to'lov: {new Date(sale.nextPaymentAt).toLocaleString("uz-UZ")}
                  </div>
                )}

                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">To'lovlar tarixi</h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {sale.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg p-2">
                        <span className="font-bold text-foreground">{p.amount.toLocaleString()}</span>
                        <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("uz-UZ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {sale.status === "partial" && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Yangi to'lov</label>
                    <div className="flex gap-2">
                      <input type="number" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} placeholder="0" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <button onClick={handleAddPayment} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={handleCompletePayment} disabled={loading} className="w-full py-2 rounded-lg bg-success text-white text-sm font-medium">
                      To'liq to'landi
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Izohlar ({client.notes?.length || 0})
              </h3>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Yangi izoh..."
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddNote}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover"
              >
                Qo'shish
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(!client.notes || client.notes.length === 0) ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Izohlar yo'q</p>
              ) : (
                [...client.notes].reverse().map((n) => (
                  <div key={n.id} className="rounded-xl bg-secondary/30 border border-border/50 p-3">
                    <p className="text-sm text-foreground leading-relaxed">{n.text}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span className="font-medium text-primary">{n.authorName}</span>
                      <span>{new Date(n.createdAt).toLocaleString("uz-UZ")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Status management */}
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Holatni o'zgartirish
            </h3>
            <div className="flex gap-2">
              <select
                value={moveStage}
                onChange={(e) => setMoveStage(e.target.value as ClientStage)}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(["new", "no_answer", "talked", "sold"] as ClientStage[]).map((st) => (
                  <option key={st} value={st}>{STAGE_LABELS[st]}</option>
                ))}
              </select>
              <button
                onClick={handleMoveStage}
                disabled={loading || moveStage === client.stage}
                className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                O'zgartirish
              </button>
            </div>
          </section>

            <section className="border-t border-border pt-5 flex justify-center">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 text-xs text-destructive hover:underline font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Mijozni o'chirib tashlash
              </button>
            </section>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Mijozni o'chirish"
        description="Ushbu mijozni o'chirishni tasdiqlaysizmi? Bu harakatni ortga qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        tone="destructive"
        loading={loading}
      />
    </div>
  );
}
