import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAppState, addTask, updateTask, deleteTask } from "@/lib/store";
import { Plus, ListChecks, Check, Clock, CheckCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/director/tasks")({
  component: DirectorTasks,
});

const tabs: { id: "active" | "done"; label: string }[] = [
  { id: "active", label: "Faol" },
  { id: "done", label: "Bajarilganlar" },
];

function statusBadge(s: TaskStatus) {
  const map: Record<TaskStatus, { label: string; cls: string; Icon: any }> = {
    new: { label: "Yangi", cls: "bg-secondary text-foreground", Icon: ListChecks },
    in_progress: { label: "Bajarilmoqda", cls: "bg-amber-100 text-amber-700", Icon: Clock },
    done: { label: "Tugatildi", cls: "bg-blue-100 text-blue-700", Icon: Check },
    approved: { label: "Tasdiqlandi", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCheck },
  };
  const v = map[s];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v.cls}`}>
      <v.Icon className="w-3 h-3" /> {v.label}
    </span>
  );
}

function DirectorTasks() {
  const { state, update } = useAppState();
  const [tab, setTab] = useState<"active" | "done">("active");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [empId, setEmpId] = useState<string>("");
  const [view, setView] = useState<Task | null>(null);

  // Mark "done" tasks as seen by director when this page opened
  useEffect(() => {
    const unseen = (state.tasks ?? []).filter((t) => t.status === "done" && !t.seenByDirector);
    if (unseen.length) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.status === "done" && !t.seenByDirector ? { ...t, seenByDirector: true } : t
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const all = state.tasks ?? [];
    return tab === "done"
      ? all.filter((t) => t.status === "approved")
      : all.filter((t) => t.status !== "approved");
  }, [state.tasks, tab]);

  const empName = (id: string) => {
    const e = state.employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "—";
  };

  const handleCreate = () => {
    if (!title.trim() || !empId) {
      toast.error("Topshiriq va hodimni tanlang");
      return;
    }
    update((s) => addTask(s, { title: title.trim(), description: desc.trim(), employeeId: empId }));
    toast.success("Topshiriq biriktirildi");
    setTitle("");
    setDesc("");
    setEmpId("");
    setOpen(false);
  };

  const approve = (t: Task) => {
    update((s) =>
      updateTask(s, t.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        seenByEmployee: false,
      })
    );
    toast.success("Topshiriq tasdiqlandi");
    setView(null);
  };

  const remove = (t: Task) => {
    update((s) => deleteTask(s, t.id));
    setView(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Topshiriqlar</h1>
          <p className="text-muted-foreground mt-1">Hodimlarga topshiriq biriktiring va nazorat qiling</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all"
        >
          <Plus className="w-4 h-4" /> Topshiriq biriktirish
        </button>
      </header>

      <div className="flex gap-2 mb-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
          Topshiriqlar yo'q
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t)}
              className="text-left bg-card rounded-xl border border-border p-4 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{t.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Hodim: <span className="text-foreground">{empName(t.employeeId)}</span>
                  </p>
                </div>
                {statusBadge(t.status)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi topshiriq</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Sarlavha</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topshiriq sarlavhasi" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Topshiriq matni</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Bajarilishi kerak bo'lgan ish..."
                rows={5}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Hodimga biriktirish</label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Hodimni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {state.employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-border text-sm"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-sm font-medium"
            >
              Biriktirish
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {statusBadge(view.status)}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Hodim</p>
                  <p className="font-medium">{empName(view.employeeId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Topshiriq</p>
                  <p className="whitespace-pre-wrap">{view.description || "—"}</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p>Yaratildi: {new Date(view.createdAt).toLocaleString("uz-UZ")}</p>
                  {view.startedAt && <p>Boshlandi: {new Date(view.startedAt).toLocaleString("uz-UZ")}</p>}
                  {view.completedAt && <p>Tugatildi: {new Date(view.completedAt).toLocaleString("uz-UZ")}</p>}
                  {view.approvedAt && <p>Tasdiqlandi: {new Date(view.approvedAt).toLocaleString("uz-UZ")}</p>}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <button
                  onClick={() => remove(view)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" /> O'chirish
                </button>
                {view.status === "done" && (
                  <button
                    onClick={() => approve(view)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    <CheckCheck className="w-4 h-4" /> Tasdiqlash
                  </button>
                )}
                {view.status !== "done" && (
                  <button
                    onClick={() => setView(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm"
                  >
                    <X className="w-4 h-4" /> Yopish
                  </button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
