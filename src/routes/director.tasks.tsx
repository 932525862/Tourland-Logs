import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAppState } from "@/lib/store";
import { Plus, ListChecks, Check, Clock, CheckCheck, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notify";
import { API } from "@/lib/api/client";
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
    new: { label: "Todo", cls: "bg-blue-100 text-blue-700", Icon: ListChecks },
    in_progress: { label: "Jarayonda", cls: "bg-amber-100 text-amber-700", Icon: Clock },
    done: { label: "Kutilmoqda", cls: "bg-purple-100 text-purple-700", Icon: Check },
    approved: { label: "Bajarildi", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCheck },
    rejected: { label: "Rad etildi", cls: "bg-destructive/10 text-destructive", Icon: X },
  };
  const v = map[s] || map.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v.cls}`}>
      <v.Icon className="w-3 h-3" /> {v.label}
    </span>
  );
}

function DirectorTasks() {
  const { state } = useAppState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [empId, setEmpId] = useState<string>("");
  const [notifyAt, setNotifyAt] = useState("09:00 AM");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [view, setView] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      const data = await API.tasks("director");
      setTasks(data);
    } catch (err: any) {
      toast.error("Topshiriqlarni yuklashda xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const unsub = API.initSocket((event, data) => {
      console.log("WS Event in DirectorTasks:", event, data);
      if (event === "taskCreated" || event === "taskStatusChanged" || event === "taskVerified") {
        fetchTasks();
        if (event === "taskStatusChanged" && data.newStatus === "PENDING") {
          playNotificationSound();
          toast.info("Yangi topshiriq tugatildi, tasdiqlash kerak");
        }
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  const list = useMemo(() => {
    return tab === "done"
      ? tasks.filter((t) => t.status === "approved")
      : tasks.filter((t) => t.status !== "approved");
  }, [tasks, tab]);

  const empName = (id: string) => {
    const e = state.employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "—";
  };

  const handleCreate = async () => {
    if (!title.trim() || !empId) {
      toast.error("Topshiriq va hodimni tanlang");
      return;
    }
    try {
      await API.createTask({ 
        title: title.trim(), 
        description: desc.trim(), 
        assignedTo: empId,
        notifyAt,
        startDate,
        endDate
      });
      toast.success("Topshiriq biriktirildi");
      setTitle("");
      setDesc("");
      setEmpId("");
      setOpen(false);
      fetchTasks();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    }
  };

  const approve = async (t: Task) => {
    try {
      await API.verifyTask(t.id);
      toast.success("Topshiriq tasdiqlandi");
      setView(null);
      fetchTasks();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    }
  };

  const reject = async (t: Task) => {
    try {
      await API.rejectTask(t.id);
      toast.error("Topshiriq rad etildi");
      setView(null);
      fetchTasks();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Topshiriqlar</h1>
          <p className="text-muted-foreground mt-1">Hodimlarga topshiriq biriktiring va nazorat qiling</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-glow transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Topshiriq biriktirish
        </button>
      </header>

      <div className="flex gap-2 mb-6 p-1 bg-secondary/50 rounded-2xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card/50 animate-pulse rounded-2xl border border-border/50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card rounded-[32px] border border-dashed border-border p-20 text-center text-muted-foreground">
          <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Topshiriqlar topilmadi</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t)}
              className="group text-left bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary transition-colors">
                  <ListChecks className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground leading-tight truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hodim: <span className="text-foreground font-medium">{empName(t.assignedTo)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(t.status)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Yangi topshiriq</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold px-1">Sarlavha</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Topshiriq sarlavhasi"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold px-1">Topshiriq matni</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Bajarilishi kerak bo'lgan ish..."
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold px-1">Hodimga biriktirish</label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger className="rounded-xl h-12">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold px-1">Boshlanish sanasi</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold px-1">Tugash sanasi</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold px-1">Eslatma vaqti (notifyAt)</label>
              <Input
                value={notifyAt}
                onChange={(e) => setNotifyAt(e.target.value)}
                placeholder="masalan: 9:00 AM"
                className="rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter className="pt-6">
            <button
              onClick={() => setOpen(false)}
              className="px-6 py-3 rounded-xl border border-border text-sm font-bold hover:bg-secondary transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleCreate}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black shadow-lg hover:shadow-glow transition-all active:scale-95"
            >
              Biriktirish
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="rounded-[40px] max-w-xl">
          {view && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center text-primary">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  {statusBadge(view.status)}
                </div>
                <DialogTitle className="text-3xl font-black">{view.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Topshiriq</p>
                  <p className="font-medium whitespace-pre-wrap leading-relaxed text-foreground">
                    {view.description || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-border/50 bg-secondary/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Hodim</p>
                    <p className="font-bold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {empName(view.assignedTo)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-border/50 bg-secondary/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sana</p>
                    <p className="font-bold">{new Date(view.createdAt).toLocaleDateString("uz-UZ")}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setView(null)}
                  className="flex-1 py-4 rounded-2xl border border-border font-bold text-muted-foreground hover:bg-secondary transition-all"
                >
                  Yopish
                </button>
                {view.status === "done" && (
                  <>
                    <button
                      onClick={() => reject(view)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-destructive text-destructive-foreground font-black shadow-lg hover:shadow-glow transition-all"
                    >
                      <RotateCcw className="w-5 h-5" /> Rad etish
                    </button>
                    <button
                      onClick={() => approve(view)}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg hover:shadow-glow transition-all"
                    >
                      <CheckCheck className="w-5 h-5" /> Tasdiqlash
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
