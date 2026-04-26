import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Briefcase, UserCog } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRM tizimi — Kirish" },
      { name: "description", content: "Korxona uchun CRM tizimi. Direktor va hodim kabinetlari." },
    ],
  }),
  component: RoleSelectPage,
});

function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-soft)] px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gradient-primary)] text-primary-foreground mb-6 shadow-[var(--shadow-glow)]">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            CRM tizimiga xush kelibsiz
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Davom etish uchun rolni tanlang
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate({ to: "/login/director" })}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border p-8 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-soft rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center text-primary-foreground mb-5 shadow-[var(--shadow-md)]">
                <UserCog className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Direktor</h2>
              <p className="text-muted-foreground">
                Hodimlarni boshqarish, formalar yaratish, mijozlar bo'limini nazorat qilish
              </p>
              <div className="mt-6 inline-flex items-center text-primary font-medium group-hover:gap-2 gap-1 transition-all">
                Kirish <span aria-hidden>→</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate({ to: "/login/employee" })}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border p-8 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center text-background mb-5 shadow-[var(--shadow-md)]">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Hodim</h2>
              <p className="text-muted-foreground">
                Mijozlar bilan ishlash, qo'ng'iroqlar, eslatmalar va arxiv
              </p>
              <div className="mt-6 inline-flex items-center text-primary font-medium group-hover:gap-2 gap-1 transition-all">
                Kirish <span aria-hidden>→</span>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Demo rejim — barcha ma'lumotlar brauzeringizda saqlanadi
        </p>
      </div>
    </div>
  );
}
