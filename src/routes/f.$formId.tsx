import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Briefcase, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api/client";
import type { FormTemplate } from "@/lib/types";

export const Route = createFileRoute("/f/$formId")({
  head: () => ({ meta: [{ title: "Forma" }] }),
  component: PublicForm,
});

function PublicForm() {
  const { formId } = Route.useParams();
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.publicForm(formId)
      .then(setForm)
      .catch(() => toast.error("Forma topilmadi"))
      .finally(() => setLoading(false));
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    for (const f of form.fields) {
      if (f.required && !values[f.label]?.trim()) {
        toast.error(`"${f.label}" maydonini to'ldiring`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await API.publicSubmit(form.id, values);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <div className="max-w-md text-center bg-card rounded-2xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">Forma topilmadi</h1>
          <p className="text-muted-foreground mt-2">Havola noto'g'ri yoki forma arxivlangan bo'lishi mumkin.</p>
          <Link to="/" className="inline-block mt-6 text-primary hover:underline">Bosh sahifaga</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <div className="max-w-md text-center bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center text-success mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Rahmat!</h1>
          <p className="text-muted-foreground mt-2">Ma'lumotlaringiz qabul qilindi. Tez orada siz bilan bog'lanamiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-primary-foreground shadow-md">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Quyidagi formani to'ldiring</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {form.fields.map((field) => (
              <div key={field.id}>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={values[field.label] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [field.label]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.label] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [field.label]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  >
                    <option value="">— Tanlang —</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "phone" ? "tel" : "text"}
                    value={values[field.label] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [field.label]: e.target.value }))}
                    placeholder={field.type === "phone" ? "+998 90 123 45 67" : ""}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary text-white font-medium shadow-md hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
