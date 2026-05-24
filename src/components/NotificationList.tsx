import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ClipboardList, 
  User, 
  Clock,
  Check,
  ChevronRight,
  DollarSign,
  UserCheck,
  BellRing,
  Layers,
  FileText,
  ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/store";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  type: string;
  data?: {
    taskId?: string;
    clientId?: string;
    departmentId?: string;
  };
  createdAt: string | Date;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  unreadCount: number;
}

const typeConfig: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  task_created: { icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10", label: "Yangi topshiriq" },
  task_status_changed: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Holat o'zgardi" },
  task_verified: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Tasdiqlandi" },
  task_rejected: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10", label: "Rad etildi" },
  task_incomplete: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Bajarilmadi" },
  client_reminder: { icon: BellRing, color: "text-indigo-500", bg: "bg-indigo-500/10", label: "Mijoz eslatmasi" },
  client_payment: { icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", label: "To'lov eslatmasi" },
  attendance_update: { icon: UserCheck, color: "text-purple-500", bg: "bg-purple-500/10", label: "Davomat" },
  department_update: { icon: Layers, color: "text-cyan-500", bg: "bg-cyan-500/10", label: "Bo'lim yangilandi" },
  form_update: { icon: FileText, color: "text-violet-500", bg: "bg-violet-500/10", label: "Yangi ariza" },
  default: { icon: Bell, color: "text-primary", bg: "bg-primary/10", label: "Bildirishnoma" },
};

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
  unreadCount,
}: NotificationListProps) {
  const navigate = useNavigate();
  const session = useSession();

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) {
      onMarkRead(n.id);
    }

    const role = session?.role || "employee";
    
    if (n.data?.taskId) {
      navigate({ to: `/${role}/tasks` as any });
    } else if (n.data?.clientId) {
      navigate({ to: (role === "director" ? "/director/clients" : "/employee") as any });
    } else if (n.data?.departmentId) {
      navigate({ to: `/${role}/departments` as any });
    } else if (n.type === "attendance_update") {
      navigate({ to: `/${role}/attendance` as any });
    } else if (n.type === "form_update") {
      navigate({ to: `/${role}/forms` as any });
    }
  };

  /**
   * Helps bold the task title or quoted strings in the message
   */
  const renderMessage = (msg: string) => {
    const parts = msg.split(/("(?:[^"\\]|\\.)*")/g);
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return <span key={i} className="font-extrabold text-foreground underline decoration-primary/20">{part}</span>;
      }
      return part;
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
              <Bell className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Bildirishnomalar</h1>
              <p className="text-sm font-medium text-muted-foreground/80">
                {unreadCount > 0 
                  ? `Sizda ${unreadCount} ta yangi bildirishnoma bor`
                  : "Hamma xabarlar o'qilgan"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="group flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Barchasini o'qildi deb belgilash
            </button>
          )}
        </div>

        <Card className="flex-1 overflow-hidden border-none shadow-none bg-transparent">
          <ScrollArea className="h-[calc(100vh-220px)] pr-4 -mr-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center bg-card/50 rounded-[2rem] border-2 border-dashed border-border/40">
                <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6 animate-pulse">
                  <Bell className="w-12 h-12 text-muted-foreground/20" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Hali hech narsa yo'q</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tizimdagi yangiliklar va bildirishnomalar shu yerda paydo bo'ladi.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-12">
                {notifications.map((n) => {
                  const config = typeConfig[n.type] || typeConfig.default;
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group relative flex items-start gap-5 p-5 md:p-6 rounded-[1.5rem] transition-all border cursor-pointer",
                        !n.isRead 
                          ? "bg-white dark:bg-zinc-900 border-primary/30 shadow-xl shadow-primary/5 ring-1 ring-primary/10" 
                          : "bg-white/40 dark:bg-zinc-900/40 border-border/40 hover:border-primary/20 hover:bg-white dark:hover:bg-zinc-900 shadow-sm"
                      )}
                      onClick={() => handleItemClick(n)}
                    >
                      <div className={cn(
                        "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-sm",
                        config.bg, config.color
                      )}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7" />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                            config.bg, config.color
                          )}>
                            {config.label}
                          </span>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground font-semibold bg-secondary/60 px-2.5 py-1 rounded-lg">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(n.createdAt), {
                                  addSuffix: true,
                                  locale: uz,
                                })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover text-popover-foreground border-border font-medium">
                              <p className="text-xs">
                                {format(new Date(n.createdAt), "d-MMMM, yyyy HH:mm", { locale: uz })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className={cn(
                          "text-sm md:text-base leading-relaxed tracking-tight",
                          !n.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                        )}>
                          {renderMessage(n.message)}
                        </div>

                        {n.data && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary/60 group-hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            Batafsil ko'rish
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-center self-stretch pl-2">
                        {!n.isRead ? (
                          <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground/10 group-hover:text-primary/40 transition-all group-hover:translate-x-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </TooltipProvider>
  );
}
