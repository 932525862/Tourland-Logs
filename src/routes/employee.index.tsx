import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAppState, useSession } from "@/lib/store";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { ClientRow } from "./director.clients";
import { toast } from "sonner";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/employee/")({
  component: EmployeeClients,
});

function EmployeeClients() {
  const { state, update } = useAppState();
  const session = useSession();
  const [activeCat, setActiveCat] = useState(state.categories.find((c) => !c.isArchive)?.id ?? "");
  const [openClient, setOpenClient] = useState<Client | null>(null);

  const visibleCats = state.categories.filter((c) => !c.isArchive);
  const currentCat = visibleCats.find((c) => c.id === activeCat) ?? visibleCats[0];
  const filtered = useMemo(
    () => state.clients.filter((c) => c.categoryId === currentCat?.id),
    [state.clients, currentCat]
  );

  const me = session?.role === "employee"
    ? state.employees.find((e) => e.id === session.employeeId)
    : null;

  // Reminder check every minute
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      state.clients.forEach((c) => {
        if (c.call.remindAt) {
          const t = new Date(c.call.remindAt).getTime();
          if (t <= now && t > now - 65 * 1000) {
            const name = c.data["Ism familya"] || c.data["Ism"] || "Mijoz";
            toast.warning(`Eslatma: ${name} bilan qayta bog'lanish vaqti keldi`, { duration: 10000 });
          }
        }
      });
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [state.clients]);

  if (!me) return null;

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Mijozlar</h1>
        <p className="text-muted-foreground mt-1">Mijozlar bilan bog'laning va izoh qoldiring</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {visibleCats.map((cat) => {
          const count = state.clients.filter((c) => c.categoryId === cat.id).length;
          const active = cat.id === currentCat?.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-md)]"
                  : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              {cat.name}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${active ? "bg-white/20" : "bg-secondary"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Bu bo'limda mijoz yo'q</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <ClientRow key={c.id} client={c} onClick={() => setOpenClient(c)} />
          ))}
        </div>
      )}

      {openClient && (
        <ClientDetailDialog
          client={state.clients.find((c) => c.id === openClient.id) ?? openClient}
          state={state}
          update={update}
          onClose={() => setOpenClient(null)}
          viewerRole="employee"
          viewerName={`${me.firstName} ${me.lastName}`}
          viewerId={me.id}
          enableCallActions
        />
      )}
    </div>
  );
}
