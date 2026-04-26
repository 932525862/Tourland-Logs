import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState, saveSession } from "@/lib/store";
import { ArrowLeft, UserCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login/director")({
  head: () => ({ meta: [{ title: "Direktor kirishi" }] }),
  component: DirectorLogin,
});

function DirectorLogin() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === state.director.login && password === state.director.password) {
      saveSession({ role: "director" });
      toast.success("Xush kelibsiz, " + state.director.name);
      navigate({ to: "/director" });
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
          <div className="w-14 h-14 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center text-primary-foreground mb-5 mx-auto shadow-[var(--shadow-md)]">
            <UserCog className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-center text-foreground">Direktor kabineti</h1>
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
                placeholder="admin"
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

          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo: <code className="bg-muted px-1.5 py-0.5 rounded">admin</code> / <code className="bg-muted px-1.5 py-0.5 rounded">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
