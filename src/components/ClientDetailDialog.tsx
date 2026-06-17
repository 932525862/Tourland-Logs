import { useState, useEffect, useMemo } from "react";
import { useSession } from "@/lib/store";
import { X, Phone, MessageSquare, Bell, Trash2, ShoppingCart, CheckCircle2, AlertCircle, Pencil, Check, ChevronRight } from "lucide-react";
import type { Client, AppState, SaleInfo, ClientStage } from "@/lib/types";
import { toast } from "sonner";
import { API } from "@/lib/api/client";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatUzDateTime, formatUzDate, getTashkentDayjs } from "@/lib/date-utils";
import { TelegramUserSingleSelect } from "@/components/TelegramUserSingleSelect";
import { TelegramMessageModal } from "@/components/TelegramMessageModal";
import { ReminderModal } from "@/components/ReminderModal";

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
  readOnly?: boolean;
}

export function ClientDetailDialog({
  client,
  state,
  onClose,
  onRefresh,
  viewerRole,
  viewerName,
  viewerId,
  readOnly = false,
}: Props) {
  const session = useSession();
  const [localClient, setLocalClient] = useState<Client>(client);

  const attachedTelegramIds = useMemo(() => {
    if (!state.clients) return [];
    return state.clients
      .filter((c: Client) => c.telegramId && c.id !== client.id)
      .map((c: Client) => String(c.telegramId));
  }, [state.clients, client.id]);

  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  useEffect(() => {
    setNoteText("");
    setMoveStage(client.stage);
    setCallNote("");
    setCallReminder("");
    setShowPurchase(false);
    setPurchaseMode("choose");
    setFullBase("");
    setFullAdditional("");
    setPartialBase("");
    setPartialAdditional("");
    setPartialPaid("");
    setPartialNextDate("");
    setExtraAmount("");
    setLeaseWarningTelegramId(null);
    setSingleTelegramId(null);
    setPaymentToDelete(null);
  }, [client.id]);

  const formatPrice = (val: string) => {
    if (!val) return "";
    return val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const parsePrice = (val: string) => val.replace(/\D/g, "");

  const [noteText, setNoteText] = useState("");
  const [moveStage, setMoveStage] = useState<ClientStage>(client.stage);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaleFlow, setShowSaleFlow] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [callReminder, setCallReminder] = useState("");
  const [showFullPaymentConfirm, setShowFullPaymentConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [singleTelegramId, setSingleTelegramId] = useState<string | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showTalkedReminderModal, setShowTalkedReminderModal] = useState(false);
  const [leaseWarningTelegramId, setLeaseWarningTelegramId] = useState<string | null>(null);

  // Sale state
  const sale: SaleInfo = localClient.sale ?? { status: "none", payments: [] };
  const totalPaid = sale.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = sale.totalAmount ? Math.max(0, sale.totalAmount - totalPaid) : 0;

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<"choose" | "full" | "partial">("choose");
  const [fullBase, setFullBase] = useState("");
  const [fullAdditional, setFullAdditional] = useState("");
  const [partialBase, setPartialBase] = useState("");
  const [partialAdditional, setPartialAdditional] = useState("");
  const [partialPaid, setPartialPaid] = useState("");
  const [partialNextDate, setPartialNextDate] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedName, setEditedName] = useState(client.name || "");
  const [editedPhone, setEditedPhone] = useState(client.phone || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(client.description || "");

  const handleAddNote = async () => {
    if (!noteText.trim() || readOnly) return;
    setLoading(true);
    try {
      await API.addNote(localClient.id, noteText.trim());
      setNoteText("");
      toast.success("Izoh qo'shildi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (field: "name" | "phone" | "description") => {
    let val = "";
    if (field === "name") val = editedName;
    else if (field === "phone") val = editedPhone;
    else if (field === "description") val = editedDescription;

    if (!val.trim() && field !== "description") {
      toast.error("Maydon bo'sh bo'lishi mumkin emas");
      return;
    }
    setLoading(true);
    try {
      await API.updateClient(localClient.id, { [field]: val.trim() });
      toast.success("Ma'lumotlar yangilandi");
      if (field === "name") setIsEditingName(false);
      else if (field === "phone") setIsEditingPhone(false);
      else setIsEditingDescription(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async () => {
    if (moveStage === localClient.stage) return;
    setLoading(true);
    try {
      await API.updateClient(localClient.id, { stage: moveStage });
      toast.success(`"${STAGE_LABELS[moveStage]}" bosqichiga ko'chirildi`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleFullPurchase = async () => {
    const baseAmt = parseFloat(fullBase || "0");
    const addAmt = parseFloat(fullAdditional || "0");
    const total = baseAmt + addAmt;
    if (total <= 0) {
      toast.error("To'lov summasini kiriting");
      return;
    }
    setLoading(true);
    try {
      await API.setSale(localClient.id, {
        status: "full",
        totalAmount: total,
        paidAmount: total,
        additionalPrice: addAmt
      });
      await API.updateClient(localClient.id, { stage: "sold" });
      setLocalClient(prev => ({ ...prev, stage: "sold" }));
      toast.success("Sotildi (to'liq)");
      setShowPurchase(false);
      setShowSaleFlow(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialPurchase = async () => {
    const baseAmt = parseFloat(partialBase || "0");
    const addAmt = parseFloat(partialAdditional || "0");
    const total = baseAmt + addAmt;
    const paid = parseFloat(partialPaid || "0");


    if (total <= 0 || paid <= 0) {
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
    if (!leaseWarningTelegramId) {
      toast.error("Ogohlantirish yuborish uchun telegram foydalanuvchisini tanlang");
      return;
    }
    setLoading(true);
    try {
      await API.setSale(localClient.id, {
        status: "partial",
        totalAmount: total,
        paidAmount: paid,
        additionalPrice: addAmt,
        nextPaymentAt: new Date(partialNextDate).toISOString(),
        telegramId: leaseWarningTelegramId
      });
      await API.updateClient(localClient.id, { stage: "sold" });
      setLocalClient(prev => ({ ...prev, stage: "sold" }));
      toast.success("Sotildi (bir qismi)");
      setShowPurchase(false);
      setShowSaleFlow(false);
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
      await API.addPayment(localClient.id, amt);
      setExtraAmount("");
      toast.success("To'lov qo'shildi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setLoading(true);
    try {
      await API.deletePayment(paymentToDelete);
      toast.success("To'lov o'chirildi");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
      setPaymentToDelete(null);
    }
  };

  const handleCompletePayment = async () => {
    setLoading(true);
    try {
      if (remaining > 0) {
        await API.addPayment(localClient.id, remaining);
      }
      await API.setSale(localClient.id, { status: "full" });
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
      await API.deleteClient(localClient.id);
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

  const handleStartCall = async () => {
    setLoading(true);
    try {
      await API.callStart(localClient.id);
      toast.success("Mijoz sizga biriktirildi, qo'ng'iroq jarayonida");

      // Immediate UI update
      setLocalClient(prev => ({
        ...prev,
        call: {
          ...prev.call,
          inCallByEmployeeId: viewerId,
          inCallByName: viewerName,
          callStartedAt: new Date().toISOString()
        }
      }));

      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCall = async (action: ClientStage) => {
    if (action === "no_answer" && !callReminder && !showReminderModal) {
      setShowReminderModal(true);
      return;
    }
    if (action === "talked" && !callReminder && !showTalkedReminderModal) {
      setShowTalkedReminderModal(true);
      return;
    }

    setLoading(true);
    try {
      if (callNote.trim()) {
        await API.addNote(localClient.id, callNote.trim());
        setCallNote("");
      }
      const payload: any = { stage: action };
      if (callReminder) {
        payload.remindAt = new Date(callReminder).toISOString();
        setCallReminder("");
      }

      await API.updateClient(localClient.id, payload);
      toast.success("Qo'ng'iroq yakunlandi");

      // Immediate UI update
      setLocalClient(prev => ({
        ...prev,
        stage: action,
        call: { ...prev.call, inCallByEmployeeId: undefined, inCallByName: undefined, callStartedAt: undefined }
      }));

      onRefresh();
      setShowReminderModal(false);
      setShowTalkedReminderModal(false);
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSaleFlow = async () => {
    setLoading(true);
    try {
      if (callNote.trim()) {
        await API.addNote(localClient.id, callNote.trim());
        setCallNote("");
      }
      const payload: any = { stage: "talked" };
      if (callReminder) {
        payload.remindAt = new Date(callReminder).toISOString();
        setCallReminder("");
      }
      await API.updateClient(localClient.id, payload);
      toast.success("Sotov jarayoni boshlandi");

      setLocalClient(prev => ({
        ...prev,
        stage: "talked",
        call: { ...prev.call, inCallByEmployeeId: undefined, inCallByName: undefined, callStartedAt: undefined }
      }));

      setShowSaleFlow(true);
      setShowPurchase(true);
      setPurchaseMode("choose");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (localClient.call?.inCallByEmployeeId === viewerId) {
      toast.warning("Ma'lum bir bo'limga biriktiring!");
      return;
    }
    if (showSaleFlow) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleConfirmClose = async () => {
    setShowCloseConfirm(false);
    setShowSaleFlow(false);
    setShowPurchase(false);
    setPurchaseMode("choose");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
              {localClient.data?.["Ism familya"] || localClient.name || "Mijoz"}
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
            <p className="text-xs text-muted-foreground">Bo'lim: {localClient.formTitle || "—"}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">


          {/* Form data / Details */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Mijoz ma'lumotlari</h3>
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm items-center min-h-[40px]">
                <span className="text-muted-foreground whitespace-nowrap">Ism familya</span>
                <div className="col-span-2 flex items-center justify-between group">
                  {isEditingName ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        autoFocus
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        className="flex-1 bg-background border border-primary/20 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                      />
                      <button
                        onClick={() => handleUpdateDetails("name")}
                        disabled={loading}
                        className="p-1 rounded bg-success/10 text-success hover:bg-success/20"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-foreground font-medium truncate">{localClient.name}</span>
                      {viewerRole === "director" && !readOnly && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm items-center min-h-[40px]">
                <span className="text-muted-foreground whitespace-nowrap">Tel raqam</span>
                <div className="col-span-2 flex items-center justify-between group">
                  {isEditingPhone ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        autoFocus
                        value={editedPhone}
                        onChange={e => setEditedPhone(e.target.value)}
                        className="flex-1 bg-background border border-primary/20 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                      />
                      <button
                        onClick={() => handleUpdateDetails("phone")}
                        disabled={loading}
                        className="p-1 rounded bg-success/10 text-success hover:bg-success/20"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-foreground font-medium truncate">{localClient.phone}</span>
                      {viewerRole === "director" && !readOnly && (
                        <button
                          onClick={() => setIsEditingPhone(true)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm items-center min-h-[40px]">
                <span className="text-muted-foreground whitespace-nowrap">Izoh</span>
                <div className="col-span-2 flex items-center justify-between group">
                  {isEditingDescription ? (
                    <div className="flex-1 flex gap-2">
                      <textarea
                        autoFocus
                        value={editedDescription}
                        onChange={e => setEditedDescription(e.target.value)}
                        className="flex-1 bg-background border border-primary/20 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/10 min-h-[60px]"
                      />
                      <button
                        onClick={() => handleUpdateDetails("description")}
                        disabled={loading}
                        className="p-1 rounded bg-success/10 text-success hover:bg-success/20 self-start mt-1"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-foreground font-medium break-words">{localClient.description || "—"}</span>
                      {viewerRole === "director" && !readOnly && (
                        <button
                          onClick={() => setIsEditingDescription(true)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {Object.entries(localClient.data || {}).map(([key, value]) => {
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

          {/* Call section - show for ALL stages except Sold, unless a call is active. Hide during sale flow. Hide if readOnly. */}
          {!showSaleFlow && !readOnly && (
            <section className="rounded-xl border border-border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" /> Qo'ng'iroq
              </h3>

              {/* If no one is calling and it's NOT sold, show the start button */}
              {!localClient.call?.inCallByEmployeeId && localClient.stage !== "sold" && (
                <button
                  onClick={handleStartCall}
                  disabled={loading || session?.isActive === false}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black shadow-lg hover:shadow-glow transition-all"
                >
                  Qo'ng'iroq qilinyapti
                </button>
              )}

              {localClient.call?.inCallByEmployeeId && localClient.call.inCallByEmployeeId !== viewerId && (
                <div className="bg-warning/10 text-warning-foreground p-3 rounded-lg text-sm text-center">
                  Ushbu mijoz bilan xozirda <strong>{localClient.call.inCallByName || "boshqa xodim"}</strong> gaplashmoqda.
                </div>
              )}


              {localClient.call?.inCallByEmployeeId === viewerId && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Siz hozir bu mijoz bilan bog'lanmoqdasiz. Yakunlang:</p>
                  <textarea
                    value={callNote}
                    onChange={(e) => setCallNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm min-h-[80px]"
                    placeholder="Ertaga o'ylab ko'raman dedi..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleCompleteCall("talked")} className="flex-[2] py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium transition-colors hover:bg-[#0F172A] hover:text-white">Gaplashildi</button>
                    <button onClick={() => handleCompleteCall("no_answer")} className="flex-[1.5] py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium transition-colors hover:bg-[#0F172A] hover:text-white">Ko'tarmadi</button>
                    <button onClick={handleStartSaleFlow} className="flex-[1] py-2.5 bg-success text-success-foreground rounded-lg text-sm font-medium hover:bg-success/90">Sotildi</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Sale section - only show if sold or already has sale. Hide action buttons if readOnly. */}
          {(localClient.stage === "sold" || sale.status !== "none" || showSaleFlow) && (
            <section className="rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Sotuv
              </h3>

              {sale.status === "none" && !showPurchase && (
                <button
                  onClick={() => setShowPurchase(true)}
                  disabled={session?.isActive === false || readOnly}
                  className="w-full py-2.5 rounded-lg bg-success text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => { setShowPurchase(false); setPurchaseMode("choose"); setShowSaleFlow(false); }}
                    className="col-span-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Bekor qilish
                  </button>
                </div>
              )}

              {sale.status === "none" && purchaseMode === "full" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">To'lov summasi</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatPrice(fullBase)}
                        onChange={(e) => setFullBase(parsePrice(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Qo'shimcha summa</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatPrice(fullAdditional)}
                        onChange={(e) => setFullAdditional(parsePrice(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Umumiy summa (jami)</label>
                    <input
                      type="text"
                      readOnly
                      value={formatPrice(((parseFloat(fullBase || "0") + parseFloat(fullAdditional || "0")) || "").toString())}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-transparent bg-secondary/50 text-foreground font-bold cursor-not-allowed text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
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
                      <label className="text-xs text-muted-foreground">To'lov summasi</label>
                      <input type="text" inputMode="numeric" value={formatPrice(partialBase)} onChange={(e) => setPartialBase(parsePrice(e.target.value))} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Qo'shimcha summa</label>
                      <input type="text" inputMode="numeric" value={formatPrice(partialAdditional)} onChange={(e) => setPartialAdditional(parsePrice(e.target.value))} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Umumiy summa</label>
                      <input
                        type="text"
                        readOnly
                        value={formatPrice(((parseFloat(partialBase || "0") + parseFloat(partialAdditional || "0")) || "").toString())}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-transparent bg-secondary/50 text-foreground font-bold cursor-not-allowed text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">To'langan summa</label>
                      <input type="text" inputMode="numeric" value={formatPrice(partialPaid)} onChange={(e) => setPartialPaid(parsePrice(e.target.value))} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Keyingi to'lov sanasi</label>
                    <input type="datetime-local" value={partialNextDate} onChange={(e) => setPartialNextDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>

                  {/* Required: Telegram warning — must select before confirming lease */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Telegram ogohlantirish <span className="text-destructive">*</span></p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {leaseWarningTelegramId ? "✓ Foydalanuvchi tanlandi" : "Tasdiqlashdan oldin tanlash shart"}
                      </p>
                    </div>
                    <TelegramUserSingleSelect
                      onSelected={(id) => setLeaseWarningTelegramId(id || null)}
                      excludeIds={attachedTelegramIds}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handlePartialPurchase}
                      disabled={loading || !leaseWarningTelegramId}
                      className="flex-1 py-2 rounded-lg bg-warning text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
                      <div className="font-bold text-destructive">{(remaining > 0 ? remaining : 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {sale.status === "partial" && remaining > 0 && sale.nextPaymentAt && (
                    <div className="flex items-center justify-between text-xs bg-warning/10 text-warning-foreground rounded-lg p-3 border border-warning/20">
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5" />
                        <span>To'lov sanasi: {formatUzDate(sale.nextPaymentAt)}</span>
                      </div>
                      <div className="font-bold animate-pulse">
                        {Math.max(0, Math.ceil((getTashkentDayjs(sale.nextPaymentAt).valueOf() - getTashkentDayjs().valueOf()) / (1000 * 60 * 60 * 24)))} kun qoldi
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">To'lovlar tarixi</h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {sale.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg p-2 group/pay">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatUzDate(p.createdAt)}</span>
                            <span className="font-bold text-foreground">{p.amount.toLocaleString()}</span>
                          </div>
                          {!readOnly && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/pay:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setSingleTelegramId(null); setShowTelegramModal(true); }}
                                className="p-1 hover:bg-primary/10 text-primary rounded"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              {viewerRole === "director" && (
                                <button
                                  onClick={() => setPaymentToDelete(p.id)}
                                  className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>


                  {sale.status === "partial" && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Yangi to'lov</label>
                      {!readOnly && session?.isActive !== false ? (
                        <>
                          <div className="flex gap-2 max-w-full">
                            <input type="text" inputMode="numeric" value={formatPrice(extraAmount)} onChange={(e) => setExtraAmount(parsePrice(e.target.value))} placeholder="0" className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
                            <button onClick={handleAddPayment} disabled={loading} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold whitespace-nowrap">
                              To'lov qo'shish
                            </button>
                          </div>
                          <button onClick={() => setShowFullPaymentConfirm(true)} className="w-full py-2 rounded-lg bg-success/15 text-success text-xs font-bold hover:bg-success/20 transition-colors">
                            To'lovni yakunlash
                          </button>
                        </>
                      ) : (
                        <p className="text-[10px] text-destructive font-bold italic">
                          {readOnly ? "Ko'rish rejimida to'lov qo'shish mumkin emas" : "To'lovni qo'shish uchun hisob faol bo'lishi kerak"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Izohlar ({localClient.notes?.length || 0})
              </h3>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={session?.isActive === false || readOnly}
                placeholder={readOnly ? "Ko'rish rejimida izoh qoldirib bo'lmaydi" : session?.isActive === false ? "Izoh qoldirish cheklangan..." : "Yangi izoh..."}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              {!readOnly && (
                <button
                  onClick={handleAddNote}
                  disabled={loading || session?.isActive === false}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                >
                  Qo'shish
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(!localClient.notes || localClient.notes.length === 0) ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Izohlar yo'q</p>
              ) : (
                [...localClient.notes].reverse().map((n) => (
                  <div key={n.id} className="rounded-xl bg-secondary/30 border border-border/50 p-3">
                    <p className="text-sm text-foreground leading-relaxed">{n.text}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span className="font-medium text-primary">{n.authorName}</span>
                      <span>{formatUzDateTime(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5 flex flex-col items-center gap-3">
            {session?.isActive === false && (
              <div className="flex items-center gap-2 text-destructive text-[10px] font-bold uppercase tracking-widest bg-destructive/5 px-3 py-1.5 rounded-lg border border-destructive/10">
                <AlertCircle className="w-3.5 h-3.5" /> Hisob faolsizlantirilgan
              </div>
            )}
            {viewerRole === "director" && !readOnly && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || session?.isActive === false}
                className="inline-flex items-center gap-2 text-xs text-destructive hover:underline font-medium disabled:opacity-30 disabled:no-underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Mijozni o'chirib tashlash
              </button>
            )}
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

      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleConfirmClose}
        title="Sotov jarayonini bekor qilish"
        description="Sotov hali yakunlanmagan. Agar yopsangiz, mijoz 'Gaplashildi' bosqichida qoladi. Davom etasizmi?"
        confirmLabel="Yopish"
        tone="destructive"
        loading={false}
      />

      <ConfirmModal
        isOpen={showFullPaymentConfirm}
        onClose={() => setShowFullPaymentConfirm(false)}
        onConfirm={() => {
          handleCompletePayment();
          setShowFullPaymentConfirm(false);
        }}
        title="To'lovni yakunlash"
        description={`Mijoz barcha qolgan summani (${remaining.toLocaleString()} so'm) to'laganini va sotuvni muvaffaqiyatli yakunlashni tasdiqlaysizmi?`}
        confirmLabel="Tasdiqlash"
        tone="success"
        loading={loading}
      />

      <ConfirmModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
        title="To'lovni o'chirish"
        description="Ushbu to'lovni o'chirishni tasdiqlaysizmi? Bu harakat sotuv balansiga ta'sir qiladi."
        confirmLabel="O'chirish"
        tone="destructive"
        loading={loading}
      />

      {showTelegramModal && (
        <TelegramMessageModal
          selectedTelegramIds={singleTelegramId ? [singleTelegramId] : []}
          clientId={localClient.id}
          onClose={() => {
            setShowTelegramModal(false);
            setSingleTelegramId(null);
          }}
          onSuccess={() => {
            setShowTelegramModal(false);
            setSingleTelegramId(null);
          }}
        />
      )}

      {showReminderModal && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          onConfirm={(time) => {
            setCallReminder(time);
            handleCompleteCall("no_answer");
          }}
          loading={loading}
        />
      )}
      {showTalkedReminderModal && (
        <ReminderModal
          isOpen={showTalkedReminderModal}
          onClose={() => setShowTalkedReminderModal(false)}
          onConfirm={(time) => {
            setCallReminder(time);
            handleCompleteCall("talked");
          }}
          title="Keyingi aloqa"
          description="Mijoz bilan yana qachon bog'lanishni rejalashtiramiz?"
          loading={loading}
        />
      )}
    </div>
  );
}
