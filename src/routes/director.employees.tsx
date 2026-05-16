import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAppState } from "@/lib/store";
import { toast } from "sonner";
import type { Employee } from "@/lib/types";
import { API } from "@/lib/api/client";
import { UserPlus, Pencil, X, Phone, User as UserIcon, Check, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

export const Route = createFileRoute("/director/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { state, update } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<Employee | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const list = await API.employees();
      update(s => ({ ...s, employees: list }));
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleToggleStatus = async () => {
    if (!confirmingStatus) return;
    setLoading(true);
    const emp = confirmingStatus;
    const action = emp.isActive ? "deaktivatsiya" : "faollashtirish";
    try {
      if (emp.isActive) await API.deactivateUser(emp.id);
      else await API.activateUser(emp.id);
      
      toast.success(`Hodim ${action} qilindi`);
      await fetchEmployees();
      setConfirmingStatus(null);
    } catch (err) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!confirmingDelete) return;
    setLoading(true);
    try {
      // Assuming API has delete method, if not I should check
      // For now let's assume we can deactivate them at least
      // If there is no delete endpoint, we just show error
      toast.error("O'chirish funksiyasi vaqtincha faol emas");
      setConfirmingDelete(null);
    } catch (err) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <header className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hodimlar</h1>
          <p className="text-muted-foreground mt-1">
            Jami: {state.employees.length} ta hodim
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-glow hover:scale-[1.02] transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5" /> Yangi hodim
        </button>
      </header>

      {state.employees.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-16 text-center text-muted-foreground">
          <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-4 text-muted-foreground/40">
            <UserIcon className="w-10 h-10" />
          </div>
          <p className="text-lg font-medium">Hali hodim qo'shilmagan</p>
          <button 
             onClick={() => setShowForm(true)}
             className="mt-4 text-primary hover:underline font-medium"
          >
            Birinchi hodimni qo'shish
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {state.employees.map((emp) => (
            <div
              key={emp.id}
              className={`bg-card border rounded-[28px] p-6 flex flex-wrap lg:flex-nowrap items-center gap-6 transition-all hover:shadow-glow hover:border-primary/20 group ${!emp.isActive ? 'opacity-70 grayscale-[0.3] border-dashed' : 'border-border'}`}
            >
              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${emp.isActive ? 'bg-primary-soft text-primary' : 'bg-secondary text-muted-foreground'}`}>
                <UserIcon className="w-8 h-8" />
              </div>

              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-1.5 text-balance">
                  <h3 className="text-xl font-bold text-foreground">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.isActive ? 'bg-success/15 text-success border border-success/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                    {emp.isActive ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-foreground/70">
                    <Phone className="w-4 h-4 text-primary" /> {emp.phone}
                  </p>
                  <p className="text-muted-foreground">Log: <span className="font-mono text-foreground/60">{emp.login}</span></p>
                  <p className="text-muted-foreground">Sana: {new Date(emp.createdAt).toLocaleDateString("uz-UZ")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto lg:ml-auto">
                <button
                  onClick={() => { setEditing(emp); setShowForm(true); }}
                  className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/30 transition-all text-sm font-bold shadow-sm"
                >
                  <Pencil className="w-4 h-4 text-primary" /> Tahrir
                </button>
                <button
                  onClick={() => setConfirmingStatus(emp)}
                  className={`flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl transition-all text-sm font-bold shadow-sm ${emp.isActive ? 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/10' : 'bg-success/10 text-success hover:bg-success hover:text-white border border-success/10'}`}
                >
                  {emp.isActive ? (
                    <><X className="w-4 h-4" /> Deaktivatsiya</>
                  ) : (
                    <><Check className="w-4 h-4" /> Faollashtirish</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EmployeeFormDialog
          employee={editing}
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            try {
              if (editing) {
                await API.updateEmployee(editing.id, {
                  firstName: data.firstName,
                  lastName: data.lastName,
                  phoneNumber: data.phone,
                  password: data.password ? data.password : undefined,
                  isActive: data.isActive
                });
                toast.success("Hodim ma'lumotlari yangilandi");
              } else {
                await API.createEmployee({
                  firstName: data.firstName,
                  lastName: data.lastName,
                  phoneNumber: data.phone,
                  password: data.password
                });
                toast.success("Yangi hodim qo'shildi");
              }
              await fetchEmployees();
              setShowForm(false);
            } catch (err: any) {
              toast.error(err.message || "Xatolik yuz berdi");
            }
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmingStatus}
        onClose={() => setConfirmingStatus(null)}
        onConfirm={handleToggleStatus}
        title={confirmingStatus?.isActive ? "Deaktivatsiya qilish" : "Faollashtirish"}
        description={`${confirmingStatus?.firstName} ${confirmingStatus?.lastName}ni ${confirmingStatus?.isActive ? "tizimdan vaqtinchalik o'chirmoqchimisiz?" : "qayta faollashtirmoqchimisiz?"}`}
        confirmLabel={confirmingStatus?.isActive ? "Deaktivatsiya" : "Faollashtirish"}
        tone={confirmingStatus?.isActive ? "destructive" : "success"}
        loading={loading}
      />
    </div>
  );
}

function EmployeeFormDialog({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSave: (data: Omit<Employee, "id" | "createdAt">) => void;
}) {
  const [firstName, setFirstName] = useState(employee?.firstName ?? "");
  const [lastName, setLastName] = useState(employee?.lastName ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [login, setLogin] = useState(employee?.login ?? "");
  const [password, setPassword] = useState(employee?.password ?? "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !login.trim() || (!employee && !password.trim())) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    setLoading(true);
    try {
      await onSave({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        phone: phone.trim(), 
        login: login.trim(), 
        password,
        isActive: employee?.isActive ?? true 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-[32px] border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/20">
          <h2 className="text-xl font-bold text-foreground">
            {employee ? "Hodimni tahrirlash" : "Yangi hodim qo'shish"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground/70 ml-1">Ism</label>
              <input
                type="text"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground/70 ml-1">Familya</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground/70 ml-1">Tel raqam</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground/70 ml-1">Login</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground/70 ml-1">Parol</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={employee ? "O'zgartirish uchun yozing" : "****"}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl border border-border font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              Bekor qilish
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-black shadow-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Yuklanmoqda..." : (employee ? "Saqlash" : "Qo'shish")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
