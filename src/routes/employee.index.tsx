import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAppState, useSession } from "@/lib/store";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientRow } from "./director.clients";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Client, ClientStage } from "@/lib/types";

const STAGES: { id: ClientStage; label: string }[] = [
  { id: "new", label: "Yangi" },
  { id: "no_answer", label: "Ko'tarmadi" },
  { id: "talked", label: "Gaplashildi" },
  { id: "sold", label: "Sotildi" },
];

export const Route = createFileRoute("/employee/")({
  component: EmployeeClients,
});

function EmployeeClients() {
  const { state, update } = useAppState();
  const session = useSession();
  const [activeCat, setActiveCat] = useState(state.categories.find((c) => !c.isArchive)?.id ?? "");
  const [stage, setStage] = useState<ClientStage>("new");
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);

  const visibleCats = state.categories.filter((c) => !c.isArchive);
  const currentCat = visibleCats.find((c) => c.id === activeCat) ?? visibleCats[0];
  const inCat = useMemo(
    () => state.clients.filter((c) => c.categoryId === currentCat?.id),
    [state.clients, currentCat]
  );
  const filtered = useMemo(() => inCat.filter((c) => c.stage === stage), [inCat, stage]);
  const counts: Record<ClientStage, number> = {
    new: inCat.filter((c) => c.stage === "new").length,
    no_answer: inCat.filter((c) => c.stage === "no_answer").length,
    talked: inCat.filter((c) => c.stage === "talked").length,
    sold: inCat.filter((c) => c.stage === "sold").length,
  };

  const me = session?.role === "employee"
    ? state.employees.find((e) => e.id === session.employeeId)
    : null;

  // Reminder check every minute
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      state.clients.forEach((c) => {
        const name = c.data["Ism familya"] || c.data["Ism"] || "Mijoz";
        if (c.call.remindAt) {
          const t = new Date(c.call.remindAt).getTime();
          if (t <= now && t > now - 65 * 1000) {
            toast.warning(`Eslatma: ${name} bilan qayta bog'lanish vaqti keldi`, {
              duration: 10000,
              action: { label: "Ochish", onClick: () => setOpenClient(c) },
            });
          }
        }
        if (c.sale?.status === "partial" && c.sale.nextPaymentAt) {
          const t = new Date(c.sale.nextPaymentAt).getTime();
          if (t <= now && t > now - 65 * 1000) {
            toast.warning(`To'lovni eslat: ${name}`, {
              duration: 10000,
              action: { label: "Ochish", onClick: () => setOpenClient(c) },
            });
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
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mijozlar</h1>
          <p className="text-muted-foreground mt-1">Mijozlar bilan bog'laning va izoh qoldiring</p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all"
        >
          <UserPlus className="w-4 h-4" /> Yangi mijoz
        </button>
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

      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-secondary/60 rounded-lg w-fit">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStage(s.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              stage === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label} <span className="ml-1 text-xs opacity-70">{counts[s.id]}</span>
          </button>
        ))}
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

      {showAddClient && (
        <AddClientDialog
          state={state}
          update={update}
          defaultCategoryId={currentCat?.id}
          onClose={() => setShowAddClient(false)}
        />
      )}
    </div>
  );
}
