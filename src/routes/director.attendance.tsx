import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState } from "@/lib/store";
import { Calendar, Clock, User as UserIcon, ArrowLeft, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/director/attendance")({
  component: DirectorAttendance,
});

function roundToHalfHour(iso: string): string {
  const d = new Date(iso);
  const mins = d.getMinutes();
  const rem = mins % 30;
  if (rem < 15) d.setMinutes(mins - rem, 0, 0);
  else d.setMinutes(mins + (30 - rem), 0, 0);
  return d.toISOString();
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function hoursWorked(rec: { checkInAt: string; checkOutAt?: string }) {
  if (!rec.checkOutAt) return 0;
  const ci = new Date(roundToHalfHour(rec.checkInAt)).getTime();
  const co = new Date(roundToHalfHour(rec.checkOutAt)).getTime();
  return Math.max(0, (co - ci) / 3600000);
}

function DirectorAttendance() {
  const { state } = useAppState();
  const [selected, setSelected] = useState<string | null>(null);

  const recordsByEmp = useMemo(() => {
    const map: Record<string, typeof state.attendance> = {};
    for (const r of state.attendance ?? []) {
      (map[r.employeeId] ||= []).push(r);
    }
    return map;
  }, [state.attendance]);

  const currentYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  if (selected) {
    const emp = state.employees.find((e) => e.id === selected);
    const recs = (recordsByEmp[selected] ?? []).slice().sort((a, b) => b.checkInAt.localeCompare(a.checkInAt));
    const monthRecs = recs.filter((r) => r.date.startsWith(currentYM));
    const monthTotal = monthRecs.reduce((s, r) => s + hoursWorked(r), 0);
    const monthDays = monthRecs.length;

    return (
      <div className="p-6 md:p-10 max-w-6xl">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {emp ? `${emp.firstName} ${emp.lastName}` : "Hodim"}
          </h1>
          <p className="text-muted-foreground mt-1">Davomat jadvali</p>
        </header>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Bu oy jami soat</p>
            <p className="text-2xl font-bold text-foreground mt-1">{monthTotal.toFixed(1)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Bu oy kunlar</p>
            <p className="text-2xl font-bold text-foreground mt-1">{monthDays}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Jami yozuvlar</p>
            <p className="text-2xl font-bold text-foreground mt-1">{recs.length}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
          {recs.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Yozuvlar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Keldi (surat)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ketdi (surat)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sana</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Keldi</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ketdi</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Soat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recs.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      {r.photo ? (
                        <img src={r.photo} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.checkOutPhoto ? (
                        <img src={r.checkOutPhoto} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary/50" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{r.date}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <span className="inline-flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5 text-muted-foreground" />{fmtTime(roundToHalfHour(r.checkInAt))}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {r.checkOutAt ? (
                        <span className="inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5 text-muted-foreground" />{fmtTime(roundToHalfHour(r.checkOutAt))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">{hoursWorked(r).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Davomat</h1>
        <p className="text-muted-foreground mt-1">Hodimlarni tanlang va davomatini ko'ring</p>
      </header>

      {state.employees.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
          Hodimlar yo'q
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.employees.map((emp) => {
            const recs = recordsByEmp[emp.id] ?? [];
            const monthRecs = recs.filter((r) => r.date.startsWith(currentYM));
            const monthTotal = monthRecs.reduce((s, r) => s + hoursWorked(r), 0);
            const last = recs.slice().sort((a, b) => b.checkInAt.localeCompare(a.checkInAt))[0];
            return (
              <button
                key={emp.id}
                onClick={() => setSelected(emp.id)}
                className="text-left bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.phone}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bu oy soat:</span>
                    <span className="text-foreground font-semibold">{monthTotal.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bu oy kun:</span>
                    <span className="text-foreground font-medium">{monthRecs.length}</span>
                  </div>
                  {last && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Oxirgi:</span>
                      <span className="text-muted-foreground">{last.date} <Clock className="w-3 h-3 inline" /> {fmtTime(roundToHalfHour(last.checkInAt))}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
