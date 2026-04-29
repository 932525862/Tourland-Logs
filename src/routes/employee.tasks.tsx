import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAppState, useSession, updateTask } from "@/lib/store";
import { Clock, Check, CheckCheck, ListChecks, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Task, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/employee/tasks")({
  component: EmployeeTasks,
});

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

const tabs: { id: "active" | "done"; label: string }[] = [
  { id: "active", label: "Faol" },
  { id: "done", label: "Bajarilganlar" },
];

function EmployeeTasks() {
  const { state, update } = useAppState();
  const session = useSession();
  const myId = session?.role === "employee" ? session.employeeId : "";
  const [tab, setTab] = useState<"active" | "done">("active");
  const [view, setView] = useState<Task | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Notify on new tasks (toast)
  useEffect(() => {
    (state.tasks ?? []).forEach((t) => {
      if (t.employeeId !== myId) return;
      if (t.status === "new" && !t.seenByEmployee && !notifiedRef.current.has(t.id)) {
        notifiedRef.current.add(t.id);
        toast.info(`Yangi topshiriq: ${t.title}`);
      }
      if (t.status === "approved" && !t.seenByEmployee && !notifiedRef.current.has("ap-" + t.id)) {
        notifiedRef.current.add("ap-" + t.id);
        toast.success(`Topshiriq tasdiqlandi: ${t.title}`);
      }
    });
  }, [state.tasks, myId]);

  // Mark all as seen when this page opens
  useEffect(() => {
    const has = (state.tasks ?? []).some((t) => t.employeeId === myId && !t.seenByEmployee);
    if (has) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.employeeId === myId && !t.seenByEmployee ? { ...t, seenByEmployee: true } : t
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myTasks = useMemo(
    () => (state.tasks ?? []).filter((t) => t.employeeId === myId),
    [state.tasks, myId]
  );
  const list = useMemo(
    () =>
      tab === "done"
        ? myTasks.filter((t) => t.status === "approved")
        : myTasks.filter((t) => t.status !== "approved"),
    [myTasks, tab]
  );

  const start = (t: Task) => {
    update((s) =>
      updateTask(s, t.id, {
        status: "in_progress",
        startedAt: t.startedAt ?? new Date().toISOString(),
      })
    );
    toast.success("Topshiriq boshlandi");
    setView({ ...t, status: "in_progress" });
  };

  const finish = (t: Task) => {
    update((s) =>
      updateTask(s, t.id, {
        status: "done",
        completedAt: new Date().toISOString(),
        seenByDirector: false,
      })
    );
    toast.success("Direktorga yuborildi");
    setView(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Topshiriqlar</h1>
        <p className="text-muted-foreground mt-1">Sizga biriktirilgan topshiriqlar</p>
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
          Topshiriq yo'q
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
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {t.description || "Tavsifsiz"}
                  </p>
                </div>
                {statusBadge(t.status)}
              </div>
            </button>
          ))}
        </div>
      )}

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
                  <p className="text-muted-foreground mb-1">Topshiriq</p>
                  <p className="whitespace-pre-wrap">{view.description || "—"}</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p>Berilgan vaqt: {new Date(view.createdAt).toLocaleString("uz-UZ")}</p>
                  {view.startedAt && <p>Boshlandi: {new Date(view.startedAt).toLocaleString("uz-UZ")}</p>}
                  {view.completedAt && <p>Tugatildi: {new Date(view.completedAt).toLocaleString("uz-UZ")}</p>}
                  {view.approvedAt && <p>Tasdiqlandi: {new Date(view.approvedAt).toLocaleString("uz-UZ")}</p>}
                </div>
              </div>
              <DialogFooter className="gap-2">
                {(view.status === "new") && (
                  <button
                    onClick={() => start(view)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
                  >
                    <Clock className="w-4 h-4" /> Bajarilmoqda
                  </button>
                )}
                {view.status === "in_progress" && (
                  <button
                    onClick={() => finish(view)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4" /> Tugatildi
                  </button>
                )}
                <button
                  onClick={() => setView(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm"
                >
                  <X className="w-4 h-4" /> Yopish
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
