import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CrmSidebar } from "@/components/CrmSidebar";
import { useSession } from "@/lib/store";
import { User, Users, FileText, UserPlus } from "lucide-react";

export const Route = createFileRoute("/director")({
  component: DirectorLayout,
});

function DirectorLayout() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.role !== "director") {
      navigate({ to: "/login/director" });
    }
  }, [session, navigate]);

  if (!session || session.role !== "director") return null;

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
        ]}
      />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
