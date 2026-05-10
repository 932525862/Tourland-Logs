import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState } from "@/lib/store";
import { BarChart3, Users, ShoppingCart, Wallet, Filter } from "lucide-react";

export const Route = createFileRoute("/director/stats")({
  component: DirectorStats,
});

function DirectorStats() {
  const { state } = useAppState();
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const clients = state.clients;
    const totalClients = clients.length;
    const soldClients = clients.filter((c) => c.sale?.status === "full");
    const partialClients = clients.filter((c) => c.sale?.status === "partial");
    const totalRevenue = clients.reduce(
      (sum, c) => sum + (c.sale?.payments?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0),
      0
    );

    // By employee (who completed the sale)
    const byEmployee = new Map<string, { name: string; count: number; revenue: number }>();
    for (const c of soldClients) {
      const name = c.sale?.completedByName ?? "Noma'lum";
      const rev = c.sale?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
      const cur = byEmployee.get(name) ?? { name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += rev;
      byEmployee.set(name, cur);
    }

    // By category
    const byCategory = state.categories.map((cat) => {
      const inCat = clients.filter((c) => c.categoryId === cat.id);
      const sold = inCat.filter((c) => c.sale?.status === "full");
      const filteredSold =
        employeeFilter === "all"
          ? sold
          : sold.filter((c) => c.sale?.completedByName === employeeFilter);
      const revenue = filteredSold.reduce(
        (s, c) => s + (c.sale?.payments?.reduce((a, p) => a + p.amount, 0) ?? 0),
        0
      );
      return {
        id: cat.id,
        name: cat.name,
        clients: inCat.length,
        sold: filteredSold.length,
        revenue,
      };
    });

    // Filtered list of sales
    const sales = soldClients
      .filter((c) =>
        employeeFilter === "all" ? true : c.sale?.completedByName === employeeFilter
      )
      .map((c) => ({
        id: c.id,
        name: c.data["Ism familya"] || c.data["Ism"] || "Mijoz",
        category: state.categories.find((cat) => cat.id === c.categoryId)?.name ?? "—",
        seller: c.sale?.completedByName ?? "—",
        amount: c.sale?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0,
        date: c.sale?.completedAt ?? c.sale?.soldAt ?? c.createdAt,
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    return {
      totalClients,
      soldCount: soldClients.length,
      partialCount: partialClients.length,
      totalRevenue,
      byEmployee: Array.from(byEmployee.values()).sort((a, b) => b.revenue - a.revenue),
      byCategory,
      sales,
    };
  }, [state, employeeFilter]);

  const fmt = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" /> Statistika
          </h1>
          <p className="text-muted-foreground mt-1">Mijozlar va sotuvlar bo'yicha umumiy ko'rsatkichlar</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="bg-transparent text-sm text-foreground focus:outline-none"
          >
            <option value="all">Barcha hodimlar</option>
            <option value={state.director.name}>{state.director.name} (direktor)</option>
            {state.employees.map((e) => (
              <option key={e.id} value={`${e.firstName} ${e.lastName}`}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users} label="Jami mijozlar" value={String(stats.totalClients)} tone="primary" />
        <KpiCard icon={ShoppingCart} label="Sotildi" value={String(stats.soldCount)} tone="success" />
        <KpiCard icon={ShoppingCart} label="Qisman to'lov" value={String(stats.partialCount)} tone="warning" />
        <KpiCard icon={Wallet} label="Umumiy daromad" value={fmt(stats.totalRevenue)} tone="primary" />
      </div>

      {/* By category */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Bo'limlar bo'yicha</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Bo'lim</th>
                <th className="text-right px-4 py-3 font-medium">Mijozlar</th>
                <th className="text-right px-4 py-3 font-medium">Sotildi</th>
                <th className="text-right px-4 py-3 font-medium">Konversiya</th>
                <th className="text-right px-4 py-3 font-medium">Daromad</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCategory.map((c) => {
                const conv = c.clients > 0 ? Math.round((c.sold / c.clients) * 100) : 0;
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right text-foreground">{c.clients}</td>
                    <td className="px-4 py-3 text-right text-success font-semibold">{c.sold}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{conv}%</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(c.revenue)}</td>
                  </tr>
                );
              })}
              {stats.byCategory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Ma'lumot yo'q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* By employee */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Hodimlar bo'yicha sotuvlar</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Hodim</th>
                <th className="text-right px-4 py-3 font-medium">Sotuvlar soni</th>
                <th className="text-right px-4 py-3 font-medium">Daromad</th>
              </tr>
            </thead>
            <tbody>
              {stats.byEmployee.map((e) => (
                <tr key={e.name} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-right text-foreground">{e.count}</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmt(e.revenue)}</td>
                </tr>
              ))}
              {stats.byEmployee.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Hali sotuv yo'q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sales list (filterable) */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Sotuvlar ro'yxati
          {employeeFilter !== "all" && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">— {employeeFilter}</span>
          )}
        </h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Mijoz</th>
                <th className="text-left px-4 py-3 font-medium">Bo'lim</th>
                <th className="text-left px-4 py-3 font-medium">Hodim</th>
                <th className="text-right px-4 py-3 font-medium">Summa</th>
                <th className="text-right px-4 py-3 font-medium">Sana</th>
              </tr>
            </thead>
            <tbody>
              {stats.sales.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.category}</td>
                  <td className="px-4 py-3 text-foreground">{s.seller}</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmt(s.amount)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {new Date(s.date).toLocaleDateString("uz-UZ")}
                  </td>
                </tr>
              ))}
              {stats.sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sotuv topilmadi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
