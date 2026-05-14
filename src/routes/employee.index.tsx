import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAppState, useSession } from "@/lib/store";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientCard } from "@/components/ClientCard";
import { UserPlus, RefreshCw, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api/client";
import { playNotificationSound } from "@/lib/notify";
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
  const [activeCat, setActiveCat] = useState("");
  const [stage, setStage] = useState<ClientStage>("new");
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const meName = session?.name || "Hodim";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cats, clients] = await Promise.all([
        API.categories(),
        API.clients()
      ]);
      update(s => ({ ...s, categories: cats, clients }));
      if (!activeCat && cats.length > 0) {
        setActiveCat(cats[0].id);
      }
    } catch (err) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.role === "employee") fetchAll();
  }, [session]);

  // Reminder Logic
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      state.clients.forEach((c) => {
        const name = c.name || "Mijoz";
        if (c.call?.remindAt) {
          const t = new Date(c.call.remindAt).getTime();
          if (t <= now && t > now - 65 * 1000) {
            playNotificationSound();
            toast.warning(`Eslatma: ${name} bilan qayta bog'lanish vaqti keldi`, {
              duration: 10000,
              action: { label: "Ochish", onClick: () => setOpenClient(c) },
            });
          }
        }
        if (c.sale?.status === "partial" && c.sale.nextPaymentAt) {
          const due = new Date(c.sale.nextPaymentAt).getTime();
          if (due <= now && due > now - 65 * 1000) {
            playNotificationSound();
            toast.warning(`To'lovni eslat: ${name}`, {
              duration: 10000,
              action: { label: "Ochish", onClick: () => setOpenClient(c) },
            });
          }
        }
      });
    };
    const id = setInterval(check, 60_000);
    check();
    return () => clearInterval(id);
  }, [state.clients]);

  const visibleCats = state.categories.filter((c) => !c.isArchive);
  const currentCat = visibleCats.find((c) => c.id === activeCat) || visibleCats[0];
  
  const filtered = useMemo(() => {
    return state.clients.filter((c) => {
      const matchesCat = c.categoryId === currentCat?.id;
      const matchesStage = c.stage === stage;
      const matchesSearch = !search || 
        (c.name || "").toLowerCase().includes(search.toLowerCase()) || 
        (c.phone || "").includes(search);
      return matchesCat && matchesStage && matchesSearch;
    });
  }, [state.clients, currentCat, stage, search]);

  const countsForCat = useMemo(() => {
    const inCat = state.clients.filter(c => c.categoryId === currentCat?.id);
    return {
      new: inCat.filter((c) => c.stage === "new").length,
      no_answer: inCat.filter((c) => c.stage === "no_answer").length,
      talked: inCat.filter((c) => c.stage === "talked").length,
      sold: inCat.filter((c) => c.stage === "sold").length,
    };
  }, [state.clients, currentCat]);

  if (!session || session.role !== "employee") return null;

  return (
    <div className="p-6 md:p-10">
      <header className="mb-10 flex items-start justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Mijozlar</h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Lidlar oqimi bilan ishlash va qaydlar</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAll}
            className="p-3 rounded-2xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddClient(true)}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-5 h-5" /> Yangi mijoz
          </button>
        </div>
      </header>

      {/* Search & Tabs */}
      <div className="flex flex-col xl:flex-row gap-6 mb-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mijoz ismi yoki tel raqami orqali qidirish..."
            className="w-full pl-12 pr-4 py-4 rounded-[20px] border border-border bg-card focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-medium text-lg"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar bg-secondary/30 p-2 rounded-[24px] border border-border/50">
          {visibleCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`px-6 py-3 rounded-[18px] text-sm font-bold whitespace-nowrap transition-all ${
                cat.id === currentCat?.id
                  ? "bg-card text-primary shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
          {visibleCats.length === 0 && <p className="px-4 py-2 text-xs text-muted-foreground italic">Bo'limlar mavjud emas</p>}
        </div>
      </div>

      {/* Stage selector */}
      <div className="flex flex-wrap gap-1.5 mb-10 p-1.5 bg-secondary/50 rounded-[22px] w-fit border border-border/40">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStage(s.id)}
            className={`px-6 py-2.5 rounded-[16px] text-sm font-black uppercase tracking-widest transition-all ${
              stage === s.id 
                ? "bg-card text-foreground shadow-sm scale-[1.02]" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/30"
            }`}
          >
            {s.label} <span className="ml-2 text-[10px] opacity-40 bg-secondary px-2 py-0.5 rounded-full">{countsForCat[s.id]}</span>
          </button>
        ))}
      </div>

      {loading && state.clients.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-44 rounded-[28px] bg-secondary/40 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[40px] p-24 text-center">
          <div className="w-24 h-24 bg-secondary rounded-[32px] flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
            <Layers className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Mijozlar topilmadi</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">Siz tanlagan filtrlar bo'yicha hech qanday mijoz aniqlanmadi.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} onClick={() => setOpenClient(c)} />
          ))}
        </div>
      )}

      {openClient && (
        <ClientDetailDialog
          client={openClient}
          state={state}
          onRefresh={fetchAll}
          onClose={() => setOpenClient(null)}
          viewerRole="employee"
          viewerName={meName}
          enableCallActions
        />
      )}

      {showAddClient && (
        <AddClientDialog
          state={state}
          defaultCategoryId={currentCat?.id}
          onCreated={fetchAll}
          onClose={() => setShowAddClient(false)}
        />
      )}
    </div>
  );
}
