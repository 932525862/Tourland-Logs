import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import type { AppState, ClientCategory } from "@/lib/types";
import { addClient } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  defaultCategoryId?: string;
  onClose: () => void;
  onCreated?: () => void;
}

export function AddClientDialog({ state, update, defaultCategoryId, onClose, onCreated }: Props) {
  const visibleCats: ClientCategory[] = state.categories.filter((c) => !c.isArchive);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(
    defaultCategoryId && visibleCats.find((c) => c.id === defaultCategoryId)
      ? defaultCategoryId
      : visibleCats[0]?.id ?? ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ism familyani kiriting");
      return;
    }
    if (!phone.trim()) {
      toast.error("Tel raqamni kiriting");
      return;
    }
    if (!categoryId) {
      toast.error("Bo'limni tanlang");
      return;
    }
    const data: Record<string, string> = {
      "Ism familya": name.trim(),
      "Tel raqam": phone.trim(),
    };
    if (note.trim()) data["Izoh"] = note.trim();

    update((s) =>
      addClient(s, {
        formId: "manual",
        formTitle: "Qo'lda qo'shilgan",
        categoryId,
        data,
      })
    );
    toast.success("Mijoz qo'shildi");
    onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Yangi mijoz qo'shish
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Ism familya</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Ali Valiyev"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Tel raqam</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Izoh (ixtiyoriy)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mijoz haqida qo'shimcha ma'lumot..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Bo'lim</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {visibleCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors">
              Bekor qilish
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)]">
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
