import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAppState, addCategory, deleteCategory } from "@/lib/store";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { Plus, FolderPlus, Trash2, User as UserIcon, Bell } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/director/clients")({
  component: DirectorClients,
});

function DirectorClients() {
  const { state, update } = useAppState();
  const [activeCat, setActiveCat] = useState(state.categories[0]?.id ?? "");
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const currentCat = state.categories.find((c) => c.id === activeCat) ?? state.categories[0];
  const filtered = useMemo(
    () => state.clients.filter((c) => c.categoryId === currentCat?.id),
    [state.clients, currentCat]
  );

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Mijozlar</h1>
        <p className="text-muted-foreground mt-1">Bo'limlar bo'yicha mijozlar ro'yxati</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {state.categories.map((cat) => {
          const count = state.clients.filter((c) => c.categoryId === cat.id).length;
          const active = cat.id === currentCat?.id;
          return (
            <div key={cat.id} className="group relative">
              <button
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
              {!cat.isArchive && state.categories.filter((c) => !c.isArchive).length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`"${cat.name}" bo'limini o'chirasizmi? Mijozlar boshqa bo'limga ko'chiriladi.`)) {
                      update((s) => deleteCategory(s, cat.id));
                      if (activeCat === cat.id) setActiveCat(state.categories[0]?.id ?? "");
                      toast.success("Bo'lim o'chirildi");
                    }
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  aria-label="O'chirish"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => setShowAddCat(true)}
          className="px-3 py-2 rounded-full text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors inline-flex items-center gap-1.5"
        >
          <FolderPlus className="w-4 h-4" /> Bo'lim qo'shish
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">
            Bu bo'limda mijoz yo'q. Forma orqali yangi mijozlar avtomatik qo'shiladi.
          </p>
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
          viewerRole="director"
          viewerName={state.director.name}
        />
      )}

      {showAddCat && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Yangi bo'lim</h2>
            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Masalan: Xitoy sayohati"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddCat(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  if (!newCatName.trim()) return;
                  update((s) => addCategory(s, newCatName.trim()));
                  toast.success("Bo'lim qo'shildi");
                  setNewCatName("");
                  setShowAddCat(false);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)]"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  const name = client.data["Ism familya"] || client.data["Ism"] || "Mijoz";
  const phone = client.data["Tel raqam"] || client.data["Telefon"] || "";
  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-xl p-4 hover:shadow-[var(--shadow-md)] hover:border-primary/40 transition-all flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary shrink-0">
        <UserIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {phone && <>📞 {phone} • </>}
          {client.formTitle}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {client.call.inCallByEmployeeId && (
          <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success">
            Bog'lanmoqda
          </span>
        )}
        {client.call.remindAt && (
          <span className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning-foreground inline-flex items-center gap-1">
            <Bell className="w-3 h-3" /> eslatma
          </span>
        )}
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {new Date(client.createdAt).toLocaleDateString("uz-UZ")}
        </span>
      </div>
    </button>
  );
}
