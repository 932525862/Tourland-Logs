import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState, useSession, addAttendance, updateAttendance } from "@/lib/store";
import { CameraCheckInDialog } from "@/components/CameraCheckInDialog";
import { Calendar, Clock, LogIn, LogOut } from "lucide-react";
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

function roundToHalfHour(iso: string): string {
  const d = new Date(iso);
  const mins = d.getMinutes();
  const rem = mins % 30;
  if (rem < 15) {
    d.setMinutes(mins - rem, 0, 0);
  } else {
    d.setMinutes(mins + (30 - rem), 0, 0);
  }
  return d.toISOString();
}

function fmtTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function hoursWorked(rec: { checkInAt: string; checkOutAt?: string }) {
  if (!rec.checkOutAt) return 0;
  const ci = new Date(roundToHalfHour(rec.checkInAt)).getTime();
  const co = new Date(roundToHalfHour(rec.checkOutAt)).getTime();
  return Math.max(0, (co - ci) / 3600000);
}

function EmployeeAttendance() {
  const { state, update } = useAppState();
  const session = useSession();
  const [openIn, setOpenIn] = useState(false);
  const [openOut, setOpenOut] = useState(false);

  const me = session?.role === "employee" ? state.employees.find((e) => e.id === session.employeeId) : null;
  const myRecords = useMemo(
    () => (state.attendance ?? []).filter((a) => a.employeeId === me?.id),
    [state.attendance, me?.id]
  );
  const today = todayStr();
  const todayRec = myRecords.find((r) => r.date === today);
  const checkedOutToday = !!todayRec?.checkOutAt;

  const monthTotal = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return myRecords
      .filter((r) => r.date.startsWith(ym))
      .reduce((sum, r) => sum + hoursWorked(r), 0);
  }, [myRecords]);

  const handleCheckIn = (photo: string) => {
    if (!me) return;
    update((s) =>
      addAttendance(s, {
        employeeId: me.id,
        employeeName: `${me.firstName} ${me.lastName}`,
        checkInAt: new Date().toISOString(),
        date: todayStr(),
        photo,
      })
    );
    setOpenIn(false);
    toast.success("Keldim — saqlandi!");
  };

  const handleCheckOut = (photo: string) => {
    if (!todayRec) return;
    update((s) =>
      updateAttendance(s, todayRec.id, {
        checkOutAt: new Date().toISOString(),
        checkOutPhoto: photo,
      })
    );
    setOpenOut(false);
    toast.success("Ketdim — saqlandi!");
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davomat</h1>
          <p className="text-muted-foreground mt-1">
            Bu oydagi jami: <span className="font-semibold text-foreground">{monthTotal.toFixed(1)} soat</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setOpenIn(true)}
            disabled={!!todayRec}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-success text-success-foreground font-semibold text-base shadow-[var(--shadow-md)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <LogIn className="w-5 h-5" /> {todayRec ? "Keldim ✓" : "Keldim"}
          </button>
          <button
            onClick={() => setOpenOut(true)}
            disabled={!todayRec || checkedOutToday}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-base shadow-[var(--shadow-md)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <LogOut className="w-5 h-5" /> {checkedOutToday ? "Ketdim ✓" : "Ketdim"}
          </button>
        </div>
      </header>

      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Davomat tarixi</h2>
        </div>
        {myRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Hozircha yozuvlar yo'q</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sana</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Keldi</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ketdi</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Soat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {myRecords.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{r.date}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{fmtTime(roundToHalfHour(r.checkInAt))}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {r.checkOutAt ? (
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{fmtTime(roundToHalfHour(r.checkOutAt))}</span>
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

      <CameraCheckInDialog
        open={openIn}
        onOpenChange={setOpenIn}
        onConfirm={handleCheckIn}
        title="Ishga keldim"
        description="Kameraga ruxsat bering va suratga oling."
        confirmLabel="Keldimni tasdiqlash"
      />
      <CameraCheckInDialog
        open={openOut}
        onOpenChange={setOpenOut}
        onConfirm={handleCheckOut}
        title="Ishdan ketdim"
        description="Ketishni tasdiqlash uchun suratga oling."
        confirmLabel="Ketdimni tasdiqlash"
      />
    </div>
  );
}
