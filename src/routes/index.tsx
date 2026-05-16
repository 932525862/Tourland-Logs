import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState, useSession, saveSession } from "@/lib/store";
import { API, setToken } from "@/lib/api/client";
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
  const [role, setRole] = useState<"director" | "employee">("director");

  useEffect(() => {
    if (session?.role === "director") navigate({ to: "/director" });
    else if (session?.role === "employee") navigate({ to: "/employee" });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Login
      const { accessToken } = await API.login(login, password);
      setToken(accessToken);

      // 2. Get Profile
      const { user } = await API.me();

      // Check if role matches selected role (optional security)
      if (user.role !== role) {
        throw new Error("Ruxsat berilmagan: Tanlangan rol mos kelmadi");
      }
      
      // 3. Save Session
      saveSession({ role: user.role, name: user.name, login: user.login });

      toast.success(`Xush kelibsiz, ${user.name}`);
      
      if (user.role === "director") navigate({ to: "/director" });
      else navigate({ to: "/employee" });
    } catch (err: any) {
      toast.error(err.message || "Login yoki parol noto'g'ri");
      setToken(null);
    }
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
            Rolingizni tanlang va tizimga kiring
          </p>

          <div className="flex gap-2 p-1 bg-secondary rounded-xl mb-6">
            <button
              onClick={() => setRole("director")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                role === "director" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Direktor
            </button>
            <button
              onClick={() => setRole("employee")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                role === "employee" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hodim
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Telefon raqam</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="+998901234567"
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
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary-hover transition-all"
            >
              Kirish
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
