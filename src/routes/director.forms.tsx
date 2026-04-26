import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState, addForm, updateForm, deleteForm, uid } from "@/lib/store";
import { Plus, Pencil, Trash2, X, Copy, ExternalLink, GripVertical, Type, Phone, ListChecks, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import type { FormTemplate, FormFieldConfig, FieldType } from "@/lib/types";

export const Route = createFileRoute("/director/forms")({
  component: FormsPage,
});

function FormsPage() {
  const { state, update } = useAppState();
  const [editing, setEditing] = useState<FormTemplate | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const buildLink = (id: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/f/${id}`;
  };

  return (
    <div className="p-6 md:p-10">
      <header className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Formalar</h1>
          <p className="text-muted-foreground mt-1">Reklama uchun formalar yarating va ulashing</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowBuilder(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all"
        >
          <Plus className="w-4 h-4" /> Yangi forma
        </button>
      </header>

      {state.forms.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Hali forma yaratilmagan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.forms.map((form) => {
            const cat = state.categories.find((c) => c.id === form.targetCategoryId);
            const link = buildLink(form.id);
            return (
              <div key={form.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{form.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {form.fields.length} ta maydon • → {cat?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditing(form); setShowBuilder(true); }}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${form.title}" formasini o'chirasizmi?`)) {
                          update((s) => deleteForm(s, form.id));
                          toast.success("Forma o'chirildi");
                        }
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-2 mt-3">
                  <code className="flex-1 text-xs text-foreground truncate">{link}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      toast.success("Havola nusxalandi");
                    }}
                    className="p-1.5 rounded-md hover:bg-background transition-colors"
                    aria-label="Nusxalash"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-background transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBuilder && (
        <FormBuilder
          form={editing}
          categories={state.categories}
          onClose={() => setShowBuilder(false)}
          onSave={(data) => {
            if (editing) {
              update((s) => updateForm(s, editing.id, data));
              toast.success("Forma yangilandi");
            } else {
              update((s) => addForm(s, data));
              toast.success("Forma yaratildi");
            }
            setShowBuilder(false);
          }}
        />
      )}
    </div>
  );
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "text", label: "Ism familya / matn", icon: Type },
  { type: "phone", label: "Tel raqam", icon: Phone },
  { type: "select", label: "Tanlash (select)", icon: ListChecks },
  { type: "textarea", label: "Qo'shimcha izoh", icon: AlignLeft },
];

function FormBuilder({
  form,
  categories,
  onClose,
  onSave,
}: {
  form: FormTemplate | null;
  categories: { id: string; name: string; isArchive?: boolean }[];
  onClose: () => void;
  onSave: (data: Omit<FormTemplate, "id" | "createdAt">) => void;
}) {
  const [title, setTitle] = useState(form?.title ?? "");
  const [fields, setFields] = useState<FormFieldConfig[]>(form?.fields ?? []);
  const [target, setTarget] = useState(form?.targetCategoryId ?? categories.find((c) => !c.isArchive)?.id ?? "");

  const addField = (type: FieldType) => {
    const defaults: Record<FieldType, string> = {
      text: "Ism familya",
      phone: "Tel raqam",
      select: "Tanlang",
      textarea: "Qo'shimcha izoh",
    };
    setFields((prev) => [
      ...prev,
      {
        id: uid("fld"),
        type,
        label: defaults[type],
        required: type !== "textarea",
        options: type === "select" ? ["Variant 1", "Variant 2"] : undefined,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<FormFieldConfig>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Forma sarlavhasini kiriting");
      return;
    }
    if (fields.length === 0) {
      toast.error("Kamida bitta maydon qo'shing");
      return;
    }
    if (!target) {
      toast.error("Mijozlar tushadigan bo'limni tanlang");
      return;
    }
    onSave({ title: title.trim(), fields, targetCategoryId: target });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold text-foreground">
            {form ? "Formani tahrirlash" : "Yangi forma yaratish"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Forma sarlavhasi</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Xitoy sayohati uchun ariza"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Mijozlar qaysi bo'limga tushadi?
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.filter((c) => !c.isArchive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Maydonlar</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => addField(type)}
                  className="px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary-soft transition-colors text-sm flex items-center gap-2 text-foreground"
                >
                  <Icon className="w-4 h-4 text-primary" /> {label}
                </button>
              ))}
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Maydon qo'shish uchun yuqoridagi tugmalardan birini tanlang
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="bg-secondary/40 border border-border rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="p-2 text-muted-foreground"><GripVertical className="w-4 h-4" /></div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-soft text-primary font-medium">
                            {FIELD_TYPES.find((t) => t.type === field.type)?.label}
                          </span>
                          <label className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required ?? false}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="rounded"
                            />
                            Majburiy
                          </label>
                        </div>
                        <input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          placeholder="Maydon nomi (sarlavha)"
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {field.type === "select" && (
                          <div className="space-y-1.5 pl-2 border-l-2 border-border">
                            {(field.options ?? []).map((opt, i) => (
                              <div key={i} className="flex gap-1.5">
                                <input
                                  value={opt}
                                  onChange={(e) => {
                                    const next = [...(field.options ?? [])];
                                    next[i] = e.target.value;
                                    updateField(field.id, { options: next });
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <button
                                  onClick={() => updateField(field.id, { options: (field.options ?? []).filter((_, j) => j !== i) })}
                                  className="p-1.5 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => updateField(field.id, { options: [...(field.options ?? []), `Variant ${(field.options?.length ?? 0) + 1}`] })}
                              className="text-xs text-primary hover:underline"
                            >
                              + Variant qo'shish
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-secondary">
            Bekor qilish
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)]">
            {form ? "Saqlash" : "Yaratish"}
          </button>
        </div>
      </div>
    </div>
  );
}
