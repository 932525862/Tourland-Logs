import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState } from "@/lib/store";
import { Calendar, Clock, User as UserIcon, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/director/attendance")({
  component: DirectorAttendance,
});

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

  if (selected) {
    const emp = state.employees.find((e) => e.id === selected);
    const recs = (recordsByEmp[selected] ?? []).slice().sort((a, b) => b.checkInAt.localeCompare(a.checkInAt));
    return (
      <div className="p-6 md:p-10 max-w-5xl">
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

        <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
          {recs.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Yozuvlar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Surat</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Sana</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Kelgan vaqti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recs.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3">
                      {r.photo ? (
                        <img src={r.photo} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary" />
                      )}
                    </td>
                    <td className="px-6 py-3 text-foreground">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {r.date}</span>
                    </td>
                    <td className="px-6 py-3 text-foreground">
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> {new Date(r.checkInAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
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
            const count = (recordsByEmp[emp.id] ?? []).length;
            const last = (recordsByEmp[emp.id] ?? []).slice().sort((a, b) => b.checkInAt.localeCompare(a.checkInAt))[0];
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Yozuvlar: <span className="text-foreground font-medium">{count}</span></span>
                  {last && (
                    <span className="text-xs text-muted-foreground">{last.date}</span>
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
