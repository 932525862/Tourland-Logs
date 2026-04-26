import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAppState, useSession } from "@/lib/store";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { ClientRow } from "./director.clients";
import { Archive } from "lucide-react";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/employee/archive")({
  component: ArchivePage,
});

function ArchivePage() {
  const { state, update } = useAppState();
  const session = useSession();
  const [openClient, setOpenClient] = useState<Client | null>(null);

  const archiveCat = state.categories.find((c) => c.isArchive);
  const filtered = useMemo(
    () => state.clients.filter((c) => c.categoryId === archiveCat?.id),
    [state.clients, archiveCat]
  );

  const me = session?.role === "employee"
    ? state.employees.find((e) => e.id === session.employeeId)
    : null;

  if (!me) return null;

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Arxiv</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} ta mijoz</p>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Arxiv bo'sh</p>
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
