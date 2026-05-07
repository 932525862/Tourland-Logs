import { useState } from "react";
import { X, Phone, MessageSquare, Bell, ArrowRightLeft, Trash2, ShoppingCart, CheckCircle2, Wallet } from "lucide-react";
import type { Client, AppState, PaymentEntry, SaleInfo, ClientStage } from "@/lib/types";
import { updateClient, uid } from "@/lib/store";
import { toast } from "sonner";

const STAGE_LABELS: Record<ClientStage, string> = {
  new: "Yangi",
  no_answer: "Ko'tarmadi",
  talked: "Gaplashildi",
  sold: "Sotildi",
};

interface Props {
  client: Client;
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onClose: () => void;
  viewerRole: "director" | "employee";
  viewerName: string;
  viewerId?: string;
  enableCallActions?: boolean;
}

export function ClientDetailDialog({
  client,
  state,
  update,
  onClose,
  viewerRole,
  viewerName,
  viewerId,
  enableCallActions = false,
}: Props) {
  const [noteText, setNoteText] = useState("");
  const [moveStage, setMoveStage] = useState<ClientStage>(client.stage);
  const [reminderDate, setReminderDate] = useState("");

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

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    update((s) =>
      updateClient(s, client.id, {
        notes: [
          ...client.notes,
          {
            id: uid("note"),
            text: noteText.trim(),
            authorName: viewerName,
            authorRole: viewerRole,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
    setNoteText("");
    toast.success("Izoh qo'shildi");
  };

  const handleMoveStage = () => {
    if (moveStage === client.stage) return;
    update((s) => updateClient(s, client.id, { stage: moveStage }));
    toast.success(`"${STAGE_LABELS[moveStage]}" bo'limiga ko'chirildi`);
  };

  const handleStartCall = () => {
    if (!viewerId) return;
    update((s) =>
      updateClient(s, client.id, {
        call: {
          inCallByEmployeeId: viewerId,
          inCallByName: viewerName,
          startedAt: new Date().toISOString(),
        },
      })
    );
    toast.success("Qo'ng'iroq boshlandi. Boshqa hodimlarga ko'rsatildi.");
  };

  const handleEndCall = (didAnswer: boolean) => {
    if (!didAnswer && !noteText.trim() && !reminderDate) {
      toast.error("Izoh yoki eslatma vaqtini kiriting");
      return;
    }
    const newNotes = [...client.notes];
    if (noteText.trim()) {
      newNotes.push({
        id: uid("note"),
        text: didAnswer ? noteText.trim() : `[Ko'tarmadi] ${noteText.trim()}`,
        authorName: viewerName,
        authorRole: viewerRole,
        createdAt: new Date().toISOString(),
      });
    }
    update((s) =>
      updateClient(s, client.id, {
        notes: newNotes,
        stage: didAnswer ? "talked" : "no_answer",
        call: reminderDate ? { remindAt: new Date(reminderDate).toISOString() } : {},
      })
    );
    setNoteText("");
    setReminderDate("");
    toast.success(reminderDate ? "Eslatma o'rnatildi" : "Qo'ng'iroq tugatildi");
  };

  const handleFullPurchase = () => {
    const amt = parseFloat(fullAmount);
    if (!amt || amt <= 0) {
      toast.error("To'lov summasini kiriting");
      return;
    }
    const payment: PaymentEntry = {
      id: uid("pay"),
      amount: amt,
      authorName: viewerName,
      authorRole: viewerRole,
      createdAt: new Date().toISOString(),
    };
    update((s) =>
      updateClient(s, client.id, {
        stage: "sold",
        sale: {
          status: "full",
          totalAmount: amt,
          payments: [payment],
          soldAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedByName: viewerName,
          completedByRole: viewerRole,
        },
      })
    );
    toast.success("Sotildi (to'liq)");
    setShowPurchase(false);
    setPurchaseMode("choose");
    setFullAmount("");
  };

  const handlePartialPurchase = () => {
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
    const payment: PaymentEntry = {
      id: uid("pay"),
      amount: paid,
      authorName: viewerName,
      authorRole: viewerRole,
      createdAt: new Date().toISOString(),
    };
    update((s) =>
      updateClient(s, client.id, {
        stage: "sold",
        sale: {
          status: "partial",
          totalAmount: total,
          payments: [payment],
          nextPaymentAt: new Date(partialNextDate).toISOString(),
          soldAt: new Date().toISOString(),
        },
      })
    );
    toast.success("Sotildi (bir qismi)");
    setShowPurchase(false);
    setPurchaseMode("choose");
    setPartialTotal("");
    setPartialPaid("");
    setPartialNextDate("");
  };

  const handleAddPayment = () => {
    const amt = parseFloat(extraAmount);
    if (!amt || amt <= 0) {
      toast.error("Summa kiriting");
      return;
    }
    const payment: PaymentEntry = {
      id: uid("pay"),
      amount: amt,
      authorName: viewerName,
      authorRole: viewerRole,
      createdAt: new Date().toISOString(),
    };
    update((s) =>
      updateClient(s, client.id, {
        sale: { ...sale, payments: [...sale.payments, payment] },
      })
    );
    setExtraAmount("");
    toast.success("To'lov qo'shildi");
  };

  const handleCompletePayment = () => {
    update((s) =>
      updateClient(s, client.id, {
        sale: {
          ...sale,
          status: "full",
          completedAt: new Date().toISOString(),
          completedByName: viewerName,
          completedByRole: viewerRole,
          nextPaymentAt: undefined,
        },
      })
    );
    toast.success("To'lov yakunlandi");
  };

  const inCallByOther = client.call.inCallByEmployeeId && client.call.inCallByEmployeeId !== viewerId;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
              {client.data["Ism familya"] || client.data["Ism"] || "Mijoz"}
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
            <p className="text-xs text-muted-foreground">Forma: {client.formTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {inCallByOther && (
            <div className="rounded-lg bg-warning/15 border border-warning/30 p-3 text-sm text-foreground">
              <strong>{client.call.inCallByName}</strong> ushbu mijoz bilan bog'lanmoqda
            </div>
          )}

          {/* Form data */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Formada qoldirilgan ma'lumotlar</h3>
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              {Object.entries(client.data).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="col-span-2 text-foreground font-medium break-words">{value || "—"}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sale section */}
          <section className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sotuv
            </h3>

            {sale.status === "none" && !showPurchase && (
              <button
                onClick={() => setShowPurchase(true)}
                className="w-full py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)]"
              >
                Sotib oldi
              </button>
            )}

            {sale.status === "none" && showPurchase && purchaseMode === "choose" && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPurchaseMode("full")}
                  className="py-3 rounded-lg bg-success text-success-foreground font-medium"
                >
                  To'liq amalga oshirdi
                </button>
                <button
                  onClick={() => setPurchaseMode("partial")}
                  className="py-3 rounded-lg bg-warning text-warning-foreground font-medium"
                >
                  Bir qismi
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
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleFullPurchase} className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium">
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
                <div>
                  <label className="text-xs text-muted-foreground">To'liq summa</label>
                  <input type="number" value={partialTotal} onChange={(e) => setPartialTotal(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To'langan summa</label>
                  <input type="number" value={partialPaid} onChange={(e) => setPartialPaid(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Keyingi to'lov sanasi</label>
                  <input type="datetime-local" value={partialNextDate} onChange={(e) => setPartialNextDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePartialPurchase} className="flex-1 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium">
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
                <div className="grid grid-cols-3 gap-2 text-sm bg-secondary/40 rounded-lg p-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Jami</div>
                    <div className="font-semibold text-foreground">{sale.totalAmount?.toLocaleString("uz-UZ")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">To'langan</div>
                    <div className="font-semibold text-success">{totalPaid.toLocaleString("uz-UZ")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Qoldiq</div>
                    <div className="font-semibold text-destructive">{remaining.toLocaleString("uz-UZ")}</div>
                  </div>
                </div>

                {sale.nextPaymentAt && sale.status === "partial" && (
                  <div className="flex items-center gap-2 text-sm bg-warning/15 text-foreground rounded-lg p-2">
                    <Bell className="w-4 h-4" /> Keyingi to'lov: {new Date(sale.nextPaymentAt).toLocaleString("uz-UZ")}
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">To'lovlar tarixi</h4>
                  <div className="space-y-1.5">
                    {sale.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg p-2">
                        <span className="font-medium text-foreground">{p.amount.toLocaleString("uz-UZ")}</span>
                        <span className="text-xs text-muted-foreground">{p.authorName} • {new Date(p.createdAt).toLocaleString("uz-UZ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {sale.status === "partial" && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className="text-xs text-muted-foreground">Yangi to'lov qo'shish</label>
                    <div className="flex gap-2">
                      <input type="number" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} placeholder="Summa" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <button onClick={handleAddPayment} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={handleCompletePayment} className="w-full py-2 rounded-lg bg-success text-success-foreground text-sm font-medium">
                      To'lab bo'lindi
                    </button>
                  </div>
                )}

                {sale.status === "full" && sale.completedByName && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-2">
                    To'lovni yakunlagan: <strong className="text-foreground">{sale.completedByName}</strong>
                    {sale.completedAt && <> • {new Date(sale.completedAt).toLocaleString("uz-UZ")}</>}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Call actions for employee */}
          {enableCallActions && viewerRole === "employee" && (
            <section className="rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" /> Qo'ng'iroq
              </h3>
              {!client.call.inCallByEmployeeId ? (
                <button
                  onClick={handleStartCall}
                  className="w-full py-2.5 rounded-lg bg-success text-success-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Qo'ng'iroq qilinyapti
                </button>
              ) : client.call.inCallByEmployeeId === viewerId ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Siz hozir bu mijoz bilan bog'lanmoqdasiz. Yakunlang:
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Izoh (mijoz nima dedi, holati...)"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Eslatma vaqti (ko'tarmagan bo'lsa)</label>
                    <input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEndCall(true)}
                      className="flex-1 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                    >
                      Gaplashildi
                    </button>
                    <button
                      onClick={() => handleEndCall(false)}
                      className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70"
                    >
                      Ko'tarmadi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Boshqa hodim ({client.call.inCallByName}) bog'lanmoqda
                </div>
              )}

              {client.call.remindAt && (
                <div className="flex items-center gap-2 text-sm text-warning-foreground bg-warning/15 rounded-lg p-3">
                  <Bell className="w-4 h-4" />
                  Eslatma: {new Date(client.call.remindAt).toLocaleString("uz-UZ")}
                </div>
              )}
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Izohlar ({client.notes.length})
            </h3>
            {!enableCallActions && (
              <div className="flex gap-2 mb-3">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Yangi izoh..."
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover"
                >
                  Qo'shish
                </button>
              </div>
            )}
            <div className="space-y-2">
              {client.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Izoh yo'q</p>
              ) : (
                [...client.notes].reverse().map((n) => (
                  <div key={n.id} className="rounded-lg bg-secondary/40 border border-border p-3">
                    <p className="text-sm text-foreground">{n.text}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>
                        {n.authorName}{" "}
                        <span className="px-1.5 py-0.5 rounded bg-primary-soft text-primary ml-1">
                          {n.authorRole === "director" ? "direktor" : "hodim"}
                        </span>
                      </span>
                      <span>{new Date(n.createdAt).toLocaleString("uz-UZ")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Move between stages within this category */}
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Holatga ko'chirish
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Mijozni shu bo'lim ichidagi bosqichlardan biriga ko'chirish
            </p>
            <div className="flex gap-2">
              <select
                value={moveStage}
                onChange={(e) => setMoveStage(e.target.value as ClientStage)}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                {(["new", "no_answer", "talked", "sold"] as ClientStage[]).map((st) => (
                  <option key={st} value={st}>{STAGE_LABELS[st]}</option>
                ))}
              </select>
              <button
                onClick={handleMoveStage}
                disabled={moveStage === client.stage}
                className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ko'chirish
              </button>
            </div>
          </section>

          {viewerRole === "director" && (
            <section className="border-t border-border pt-5">
              <button
                onClick={() => {
                  if (confirm("Mijozni o'chirishni tasdiqlaysizmi?")) {
                    update((s) => ({ ...s, clients: s.clients.filter((c) => c.id !== client.id) }));
                    toast.success("Mijoz o'chirildi");
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-2 text-sm text-destructive hover:underline"
              >
                <Trash2 className="w-4 h-4" /> Mijozni o'chirish
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
