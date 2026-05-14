import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAppState, useSession, updateTask } from "@/lib/store";
import { Clock, Check, CheckCheck, ListChecks, X, Calendar, AlertCircle, Play, Send } from "lucide-react";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/employee/tasks")({
  component: EmployeeTasks,
});

function statusBadge(s: TaskStatus) {
  const map: Record<TaskStatus, { label: string; cls: string; Icon: any }> = {
    new: { label: "Yangi", cls: "bg-secondary text-foreground border-border", Icon: ListChecks },
    in_progress: { label: "Bajarilmoqda", cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: Clock },
    done: { label: "Tugatildi", cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: Check },
    approved: { label: "Tasdiqlandi", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCheck },
  };
  const v = map[s] || map.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${v.cls}`}>
      <v.Icon className="w-3.5 h-3.5" /> {v.label}
    </span>
  );
}

const tabs: { id: "active" | "done"; label: string }[] = [
  { id: "active", label: "Faol topshiriqlar" },
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
        playNotificationSound();
        toast.info(`Yangi topshiriq: ${t.title}`);
      }
      if (t.status === "approved" && !t.seenByEmployee && !notifiedRef.current.has("ap-" + t.id)) {
        notifiedRef.current.add("ap-" + t.id);
        playNotificationSound();
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
  }, []);

  const myTasks = useMemo(
    () => (state.tasks ?? []).filter((t) => t.employeeId === myId),
    [state.tasks, myId]
  );
  const list = useMemo(
    () =>
      tab === "done"
        ? myTasks.filter((t) => t.status === "approved").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        : myTasks.filter((t) => t.status !== "approved").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
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
    toast.success("Direktorga tasdiqlash uchun yuborildi");
    setView(null);
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-10 text-balance">
        <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
           <ListChecks className="w-10 h-10 text-primary" /> Topshiriqlar
        </h1>
        <p className="text-muted-foreground mt-1.5 font-medium">Sizga biriktirilgan vazifalar va ularning ijrosi</p>
      </header>

      <div className="flex gap-2 mb-8 p-1.5 bg-secondary/50 rounded-[22px] w-fit border border-border/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 rounded-[16px] text-sm font-black uppercase tracking-widest transition-all ${
              tab === t.id 
                ? "bg-card text-foreground shadow-sm scale-[1.02]" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[40px] p-24 text-center">
           <div className="w-24 h-24 bg-secondary rounded-[32px] flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
             <AlertCircle className="w-12 h-12" />
           </div>
           <h3 className="text-xl font-bold text-foreground mb-2">Topshiriqlar yo'q</h3>
           <p className="text-muted-foreground max-w-sm mx-auto">Sizda hozircha ushbu bo'limda hech qanday topshiriq mavjud emas.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t)}
              className="text-left bg-card rounded-[28px] border border-border p-6 hover:shadow-glow hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-125" />
              
              <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${t.status === 'approved' ? 'bg-success/10 text-success' : 'bg-primary-soft text-primary'}`}>
                  <ListChecks className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">{t.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-0.5 line-clamp-1">{t.description || "Tavsifsiz"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 shrink-0 relative z-10 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right flex flex-col items-end">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                   {statusBadge(t.status)}
                </div>
                <div className="text-right flex flex-col items-end border-l border-border pl-6 hidden sm:flex">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sana</p>
                   <p className="text-xs font-bold text-foreground">{new Date(t.createdAt).toLocaleDateString("uz-UZ")}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-xl rounded-[40px] border-border bg-card p-0 overflow-hidden">
          {view && (
            <div className="flex flex-col">
              <div className="p-8 border-b border-border bg-secondary/10 relative">
                <DialogHeader className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center text-primary">
                       <ListChecks className="w-6 h-6" />
                    </div>
                    {statusBadge(view.status)}
                  </div>
                  <DialogTitle className="text-2xl font-black text-foreground">{view.title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Topshiriq tavsifi</h4>
                    <div className="p-5 rounded-2xl bg-background/50 border border-border font-medium text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
                      {view.description || "Ushbu topshiriq uchun qo'shimcha tavsif berilmagan."}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-border/50">
                   <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Berilgan vaqt</p>
                        <p className="text-xs font-bold text-foreground">{new Date(view.createdAt).toLocaleString("uz-UZ")}</p>
                      </div>
                   </div>
                   {view.startedAt && (
                     <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Boshlandi</p>
                          <p className="text-xs font-bold text-foreground">{new Date(view.startedAt).toLocaleString("uz-UZ")}</p>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-8 flex gap-4">
                {(view.status === "new") && (
                  <button
                    onClick={() => start(view)}
                    className="flex-1 inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-amber-500 text-white font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Play className="w-5 h-5" /> Boshlash
                  </button>
                )}
                {view.status === "in_progress" && (
                  <button
                    onClick={() => finish(view)}
                    className="flex-1 inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Send className="w-5 h-5" /> Tugatish
                  </button>
                )}
                <button
                  onClick={() => setView(null)}
                  className="px-8 py-4 rounded-2xl border border-border font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  Yopish
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
