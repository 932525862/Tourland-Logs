import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState, useSession, addAttendance } from "@/lib/store";
import { CameraCheckInDialog } from "@/components/CameraCheckInDialog";
import { Calendar, Clock, LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/attendance")({
  component: EmployeeAttendance,
});

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function EmployeeAttendance() {
  const { state, update } = useAppState();
  const session = useSession();
  const [open, setOpen] = useState(false);

  const me = session?.role === "employee" ? state.employees.find((e) => e.id === session.employeeId) : null;
  const myRecords = useMemo(
    () => (state.attendance ?? []).filter((a) => a.employeeId === me?.id),
    [state.attendance, me?.id]
  );
  const today = todayStr();
  const checkedInToday = myRecords.some((r) => r.date === today);

  const handleConfirm = (photo: string) => {
    if (!me) return;
    const now = new Date();
    update((s) =>
      addAttendance(s, {
        employeeId: me.id,
        employeeName: `${me.firstName} ${me.lastName}`,
        checkInAt: now.toISOString(),
        date: todayStr(),
        photo,
      })
    );
    setOpen(false);
    toast.success("Davomat saqlandi!");
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davomat</h1>
          <p className="text-muted-foreground mt-1">Ishga kelganingizni belgilang</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={checkedInToday}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn className="w-4 h-4" /> {checkedInToday ? "Bugun belgilandi" : "Keldim"}
        </button>
      </header>

      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Davomat tarixi</h2>
        </div>
        {myRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Hozircha yozuvlar yo'q</div>
        ) : (
          <ul className="divide-y divide-border">
            {myRecords.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-6 py-3">
                {r.photo && (
                  <img src={r.photo} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{r.employeeName}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-0.5">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {r.date}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(r.checkInAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CameraCheckInDialog open={open} onOpenChange={setOpen} onConfirm={handleConfirm} />
    </div>
  );
}
