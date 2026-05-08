import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CrmSidebar } from "@/components/CrmSidebar";
import { useSession, useAppState } from "@/lib/store";
import { Users, Archive, User as UserIcon, ClipboardCheck, ListChecks } from "lucide-react";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const session = useSession();
  const { state } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.role !== "employee") {
      navigate({ to: "/" });
    }
  }, [session, navigate]);

  const me =
    session?.role === "employee"
      ? state.employees.find((e) => e.id === session.employeeId)
      : null;

  useEffect(() => {
    if (session?.role === "employee" && !state.employees.find((e) => e.id === session.employeeId)) {
      navigate({ to: "/" });
    }
  }, [state.employees, session, navigate]);

  if (!session || session.role !== "employee") return null;

  const myEmpId = session.role === "employee" ? session.employeeId : "";
  const taskBadge = (state.tasks ?? []).filter(
    (t) => t.employeeId === myEmpId && !t.seenByEmployee
  ).length;

  return (
    <div className="min-h-screen flex bg-background">
      <CrmSidebar
        title={me ? `${me.firstName} ${me.lastName}` : "Hodim"}
        subtitle="Hodim kabineti"
        items={[
          { to: "/employee", label: "Mijozlar", icon: Users },
          { to: "/employee/tasks", label: "Topshiriqlar", icon: ListChecks, badge: taskBadge },
          { to: "/employee/attendance", label: "Davomat", icon: ClipboardCheck },
          { to: "/employee/archive", label: "Arxiv", icon: Archive },
        ]}
        footer={
          me && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{me.firstName} {me.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{me.phone}</p>
              </div>
            </div>
          )
        }
      />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
