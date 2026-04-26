import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState, saveSession } from "@/lib/store";
import { ArrowLeft, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login/employee")({
  head: () => ({ meta: [{ title: "Hodim kirishi" }] }),
  component: EmployeeLogin,
});

function EmployeeLogin() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = state.employees.find((e) => e.login === login && e.password === password);
    if (emp) {
      saveSession({ role: "employee", employeeId: emp.id });
      toast.success(`Xush kelibsiz, ${emp.firstName}`);
      navigate({ to: "/employee" });
    } else {
      toast.error("Login yoki parol noto'g'ri");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-soft)] px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-lg)]">
          <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center text-background mb-5 mx-auto shadow-[var(--shadow-md)]">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-center text-foreground">Hodim kabineti</h1>
          <p className="text-center text-sm text-muted-foreground mt-1 mb-6">
            Direktor bergan login va parolni kiriting
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Login</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Parol</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-foreground text-background font-medium shadow-[var(--shadow-md)] hover:opacity-90 transition-all"
            >
              Kirish
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo: <code className="bg-muted px-1.5 py-0.5 rounded">aziz</code> / <code className="bg-muted px-1.5 py-0.5 rounded">12345</code>
          </p>
        </div>
      </div>
    </div>
  );
}
