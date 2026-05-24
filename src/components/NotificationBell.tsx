import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/use-notifications";
import { useSession } from "@/lib/store";

export function NotificationBell() {
  const session = useSession();
  const { unreadCount } = useNotifications();

  const role = session?.role === "director" ? "director" : "employee";
  const to = `/${role}/notifications` as any;

  return (
    <Link
      to={to}
      className="relative p-2 rounded-xl hover:bg-secondary transition-all active:scale-95 group"
    >
      <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
