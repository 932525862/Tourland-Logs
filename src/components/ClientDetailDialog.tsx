import { useState } from "react";
import { X, Phone, MessageSquare, Bell, Archive, ArrowRightLeft, Trash2 } from "lucide-react";
import type { Client, AppState } from "@/lib/types";
import { updateClient, uid } from "@/lib/store";
import { toast } from "sonner";

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
  const form = state.forms.find((f) => f.id === client.formId);
  const [noteText, setNoteText] = useState("");
  const [moveTo, setMoveTo] = useState(client.categoryId);
  const [reminderDate, setReminderDate] = useState("");

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

  const handleMove = () => {
    if (moveTo === client.categoryId) return;
    update((s) => updateClient(s, client.id, { categoryId: moveTo }));
    const cat = state.categories.find((c) => c.id === moveTo);
    toast.success(`"${cat?.name}" bo'limiga ko'chirildi`);
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
        call: reminderDate
          ? { remindAt: new Date(reminderDate).toISOString() }
          : {},
      })
    );
    setNoteText("");
    setReminderDate("");
    toast.success(reminderDate ? "Eslatma o'rnatildi" : "Qo'ng'iroq tugatildi");
  };

  const inCallByOther = client.call.inCallByEmployeeId && client.call.inCallByEmployeeId !== viewerId;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {client.data["Ism familya"] || client.data["Ism"] || "Mijoz"}
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

          {/* Move to category */}
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Bo'limga ko'chirish
            </h3>
            <div className="flex gap-2">
              <select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.isArchive ? " (arxiv)" : ""}</option>
                ))}
              </select>
              <button
                onClick={handleMove}
                disabled={moveTo === client.categoryId}
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
