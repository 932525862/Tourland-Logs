import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CrmSidebar } from "@/components/CrmSidebar";
import { useSession, useAppState } from "@/lib/store";
import { User, Users, FileText, UserPlus, ClipboardCheck, ListChecks } from "lucide-react";

export const Route = createFileRoute("/director")({
  component: DirectorLayout,
});

function DirectorLayout() {
  const session = useSession();
  const { state } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.role !== "director") {
      navigate({ to: "/" });
    }
  }, [session, navigate]);

  if (!session || session.role !== "director") return null;

  // Notif: tasks marked done by employees but not yet seen by director
  const taskBadge = (state.tasks ?? []).filter(
    (t) => t.status === "done" && !t.seenByDirector
  ).length;

  return (
    <div className="min-h-screen flex bg-background">
      <CrmSidebar
        title="Direktor kabineti"
        subtitle="Boshqaruv paneli"
        items={[
          { to: "/director", label: "Profil", icon: User },
          { to: "/director/employees", label: "Hodimlar", icon: Users },
          { to: "/director/clients", label: "Mijozlar", icon: UserPlus },
          { to: "/director/forms", label: "Formalar", icon: FileText },
          { to: "/director/attendance", label: "Davomat", icon: ClipboardCheck },
          { to: "/director/tasks", label: "Topshiriqlar", icon: ListChecks, badge: taskBadge },
        ]}
      />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
