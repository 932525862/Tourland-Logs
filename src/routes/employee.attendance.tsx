import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useAppState, useSession } from "@/lib/store";
import { CameraCheckInDialog } from "@/components/CameraCheckInDialog";
import { Calendar, Clock, LogIn, LogOut, Coffee, Timer, User, X } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api/client";

export const Route = createFileRoute("/employee/attendance")({
  component: EmployeeAttendance,
});

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function hoursWorked(rec: { checkInAt: string; checkOutAt?: string }) {
  if (!rec.checkOutAt) return 0;
  const ci = new Date(rec.checkInAt).getTime();
  const co = new Date(rec.checkOutAt).getTime();
  return Math.max(0, (co - ci) / 3600000);
}

function EmployeeAttendance() {
  const { state, update } = useAppState();
  const session = useSession();
  const [openIn, setOpenIn] = useState(false);
  const [openOut, setOpenOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const list = await API.myAttendance();
      update(s => ({ ...s, attendance: list }));
    } catch {
      toast.error("Davomat ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [session]);

  const me = session?.role === "employee" ? state.employees.find((e) => e.id === session.employeeId) : null;
  
  const myRecords = useMemo(
    () => (state.attendance ?? [])
      .filter((a) => String(a.employeeId) === String(me?.id))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [state.attendance, me?.id]
  );
  
  const today = todayStr();
  // An active record is one from today that doesn't have a check-out time
  const activeRec = myRecords.find(r => r.date === today && !r.checkOutAt);
  // Also check if they already finished today
  const finishedToday = myRecords.some(r => r.date === today && r.checkOutAt);
  const canCheckIn = !activeRec && !finishedToday;

  const monthTotal = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return myRecords
      .filter((r) => r.date.startsWith(ym))
      .reduce((sum, r) => sum + hoursWorked(r), 0);
  }, [myRecords]);

  const handleCheckIn = async (photo: string) => {
    try {
      await API.checkIn(photo);
      toast.success("Xush kelibsiz! Ish kuni boshlandi.");
      await fetchAttendance();
      setOpenIn(false);
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  const handleCheckOut = async (photo: string) => {
    try {
      await API.checkOut(activeRec?.id || "", photo);
      toast.success("Ish kuni yakunlandi. Charchamang!");
      await fetchAttendance();
      setOpenOut(false);
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  if (!me) return null;

  return (
    <div className="p-6 md:p-10">
      <header className="mb-10 flex items-start justify-between flex-wrap gap-6 text-balance">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
             <Clock className="w-10 h-10 text-primary" /> Davomat
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Ish vaqtingizni oson nazorat qiling va qayd eting</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAttendance}
            title="Yangilash"
            className="p-3 rounded-2xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setOpenIn(true)}
            disabled={!canCheckIn}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-success text-success-foreground font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            <LogIn className="w-5 h-5" /> {finishedToday ? "Ishga kelindi ✓" : "Ishga keldim"}
          </button>
          <button
            onClick={() => setOpenOut(true)}
            disabled={!activeRec}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-destructive text-destructive-foreground font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            <LogOut className="w-5 h-5" /> Ishdan ketdim
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border rounded-[28px] p-6 shadow-sm group hover:border-primary/20 transition-all">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-[18px] bg-primary-soft text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                 <Timer className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bugun ishlanyapti</p>
           </div>
           <p className="text-3xl font-black text-foreground">
             {activeRec ? (
               <span className="flex items-baseline gap-1">
                 {((Date.now() - new Date(activeRec.checkInAt).getTime()) / 3600000).toFixed(1)}
                 <span className="text-sm font-bold text-muted-foreground">soat</span>
               </span>
             ) : (
               finishedToday ? myRecords.filter(r => r.date === today).reduce((s, r) => s + hoursWorked(r), 0).toFixed(1) : "0.0"
             )}
             {!activeRec && <span className="text-sm font-bold text-muted-foreground ml-1">soat</span>}
           </p>
        </div>
        <div className="bg-card border border-border rounded-[28px] p-6 shadow-sm group hover:border-success/20 transition-all">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-[18px] bg-success/15 text-success flex items-center justify-center transition-transform group-hover:scale-110">
                 <Coffee className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Shu oyda jami</p>
           </div>
           <p className="text-3xl font-black text-foreground">{monthTotal.toFixed(1)} <span className="text-sm font-bold text-muted-foreground">soat</span></p>
        </div>
        <div className="bg-card border border-border rounded-[28px] p-6 shadow-sm group hover:border-secondary transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/20 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125" />
           <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-[18px] bg-secondary text-muted-foreground flex items-center justify-center">
                 <User className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sizning profilingiz</p>
           </div>
           <p className="text-xl font-black text-foreground truncate relative z-10">{me.firstName} {me.lastName}</p>
        </div>
      </div>

      <section className="bg-card border border-border rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Tarixiy qaydlar
          </h2>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-bold text-success uppercase tracking-widest">Tizim faol</span>
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
              <tr>
                <th className="text-left px-6 py-5">Sana</th>
                <th className="text-left px-6 py-5">Kelish</th>
                <th className="text-left px-6 py-5">Ketish</th>
                <th className="text-center px-6 py-5">Surat</th>
                <th className="text-right px-6 py-5">Ish vaqti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {myRecords.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20 transition-all group">
                  <td className="px-6 py-5">
                    <div className="text-foreground font-bold">{new Date(r.date).toLocaleDateString("uz-UZ", { day: 'numeric', month: 'long' })}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{new Date(r.date).toLocaleDateString("uz-UZ", { weekday: 'long' })}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold border border-success/10">
                       <LogIn className="w-3.5 h-3.5" /> {fmtTime(r.checkInAt)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {r.checkOutAt ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-bold border border-destructive/10">
                        <LogOut className="w-3.5 h-3.5" /> {fmtTime(r.checkOutAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold animate-pulse border border-primary/20">
                        Ish jarayonida...
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                     <div className="flex items-center justify-center gap-2">
                        {r.photo && (
                           <button onClick={() => setSelectedPhoto(r.photo || null)} className="w-10 h-10 rounded-lg overflow-hidden border border-border shadow-sm hover:scale-110 transition-transform bg-muted">
                              <img src={r.photo} alt="In" className="w-full h-full object-cover" />
                           </button>
                        )}
                        {r.checkOutPhoto && (
                           <button onClick={() => setSelectedPhoto(r.checkOutPhoto || null)} className="w-10 h-10 rounded-lg overflow-hidden border border-border shadow-sm hover:scale-110 transition-transform bg-muted">
                              <img src={r.checkOutPhoto} alt="Out" className="w-full h-full object-cover" />
                           </button>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-foreground font-black text-lg">{hoursWorked(r).toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">soat</div>
                  </td>
                </tr>
              ))}
              {myRecords.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="w-20 h-20 bg-secondary/50 rounded-[28px] flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                       <Calendar className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Qaydlar topilmadi</h3>
                    <p className="text-sm text-muted-foreground">Sizning davomat tarixingiz hali shakllanmagan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
         <div className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPhoto(null)}>
            <div className="relative max-w-2xl w-full aspect-square sm:aspect-video rounded-[32px] overflow-hidden border-4 border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
               <img src={selectedPhoto} className="w-full h-full object-cover" alt="Preview" />
               <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 p-2.5 rounded-2xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all">
                  <X className="w-6 h-6" />
               </button>
            </div>
         </div>
      )}

      <CameraCheckInDialog
        open={openIn}
        onOpenChange={setOpenIn}
        onConfirm={handleCheckIn}
        title="Ishga kelishni tasdiqlash"
        description="Ish boshlaganingizni qayd etish uchun suratga tushing."
        confirmLabel="Ishni boshlash"
      />
      <CameraCheckInDialog
        open={openOut}
        onOpenChange={setOpenOut}
        onConfirm={handleCheckOut}
        title="Ishdan ketishni tasdiqlash"
        description="Ish kuningizni yakunlash uchun suratga tushing."
        confirmLabel="Ishni yakunlash"
      />
    </div>
  );
}

const RefreshCw = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
