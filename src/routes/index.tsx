import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState, useSession, saveSession } from "@/lib/store";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRM tizimi — Kirish" },
      { name: "description", content: "CRM tizimiga kirish" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { state } = useAppState();
  const session = useSession();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (session?.role === "director") navigate({ to: "/director" });
    else if (session?.role === "employee") navigate({ to: "/employee" });
  }, [session, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === state.director.login && password === state.director.password) {
      saveSession({ role: "director" });
      toast.success("Xush kelibsiz, " + state.director.name);
      navigate({ to: "/director" });
      return;
    }
    const emp = state.employees.find((x) => x.login === login && x.password === password);
    if (emp) {
      saveSession({ role: "employee", employeeId: emp.id });
      toast.success(`Xush kelibsiz, ${emp.firstName}`);
      navigate({ to: "/employee" });
      return;
    }
    toast.error("Login yoki parol noto'g'ri");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-soft)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-lg)]">
          <div className="w-14 h-14 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center text-primary-foreground mb-5 mx-auto shadow-[var(--shadow-md)]">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-center text-foreground">
            CRM tizimiga xush kelibsiz
          </h1>
          <p className="text-center text-sm text-muted-foreground mt-1 mb-6">
            Login va parolni kiriting
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Login</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Login"
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
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all"
            >
              Kirish
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
