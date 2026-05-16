import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAppState, useSession } from "@/lib/store";
import { Archive, RefreshCw, Clock, User, Tag, Search } from "lucide-react";
import { API } from "@/lib/api/client";
import { toast } from "sonner";
import dayjs from "dayjs";
import "dayjs/locale/uz-latn";

export const Route = createFileRoute("/director/archive")({
  component: DirectorArchive,
});

interface ActivityLog {
  id: string;
  actionType: string;
  details?: any;
  user?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

function DirectorArchive() {
  const session = useSession();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await API.directorArchive();
      setLogs(data);
    } catch {
      toast.error("Arxiv ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatLogAction = (actionType: string) => {
    switch (actionType) {
      case "TASK_CREATED": return "Vazifa yaratildi";
      case "TASK_STATUS_CHANGED": return "Vazifa holati o'zgardi";
      case "TASK_VERIFIED": return "Vazifa tasdiqlandi";
      case "TASK_REJECTED": return "Vazifa rad etildi";
      case "TASK_INCOMPLETE": return "Vazifa yakunlanmadi";
      case "PROFILE_UPDATED": return "Profil yangilandi";
      default: return actionType.replace(/_/g, " ");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "todo": return "bg-secondary text-secondary-foreground";
      case "in_progress": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "done": return "bg-success/15 text-success border-success/20";
      case "rejected": return "bg-destructive/15 text-destructive border-destructive/20";
      case "incomplete": return "bg-destructive/10 text-destructive grayscale opacity-70";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.actionType?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-10">
      <header className="mb-10 flex items-start justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Archive className="w-10 h-10 text-primary" /> Arxiv
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">
            Tizimdagi barcha harakatlar tarixi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="p-3 rounded-2xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {loading && logs.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-secondary/40 animate-pulse border border-border/50"
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[40px] p-24 text-center">
          <div className="w-24 h-24 bg-secondary rounded-[32px] flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
            <Archive className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Harakatlar topilmadi</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Arxivda hozircha hech qanday ma'lumot yo'q.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="group bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-primary-soft group-hover:text-primary transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">
                    {formatLogAction(log.actionType)}
                  </span>
                  {log.details?.taskId && (
                    <span className="text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      Vazifa
                    </span>
                  )}
                </div>
                
                {log.details?.title && (
                  <p className="text-sm font-medium text-foreground/80 mb-1">
                    "{log.details.title}"
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {log.details?.oldStatus && (
                    <>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(log.details.oldStatus)}`}>
                        {log.details.oldStatus}
                      </span>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  {log.details?.newStatus && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(log.details.newStatus)}`}>
                      {log.details.newStatus}
                    </span>
                  )}
                  {log.details?.status && !log.details?.newStatus && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(log.details.status)}`}>
                      {log.details.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <User className="w-3 h-3 text-muted-foreground" />
                  {log.user?.firstName} {log.user?.lastName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {dayjs(log.createdAt).locale("uz-latn").format("DD MMM, HH:mm")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
