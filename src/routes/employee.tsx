import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CrmSidebar } from "@/components/CrmSidebar";
import { MobileNav } from "@/components/MobileNav";
import { useSession, useAppState } from "@/lib/store";
import { Users, Archive, User as UserIcon, ClipboardCheck, ListChecks, Layers } from "lucide-react";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.role !== "employee") {
      navigate({ to: "/" });
    }
  }, [session, navigate]);

  if (!session || session.role !== "employee") return null;

  const navItems = [
    { to: "/employee", label: "Mijozlar", icon: Users },
    { to: "/employee/departments", label: "Bo'limlar", icon: Layers },
    { to: "/employee/forms", label: "Formalar", icon: ClipboardCheck },
    { to: "/employee/tasks", label: "Topshiriqlar", icon: ListChecks },
    { to: "/employee/attendance", label: "Davomat", icon: ClipboardCheck },
    { to: "/employee/archive", label: "Arxiv", icon: Archive },
    { to: "/employee/profile", label: "Profil", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <MobileNav title={session.name} subtitle="Hodim kabineti" items={navItems} />
      <CrmSidebar
        title={session.name}
        subtitle="Hodim kabineti"
        items={navItems}
        footer={
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary shrink-0 shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{session.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-widest leading-none mt-1">Onlayn</p>
            </div>
          </div>
        }
      />
      <main className="flex-1 min-w-0 pb-10 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
