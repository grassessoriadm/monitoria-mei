import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/mei/store";
import { Login } from "./Login";
import { cn } from "@/lib/utils";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
        active ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, session, logout } = useStore();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>
    );
  }
  if (!session) return <Login />;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo-gr-transparente.png"
              alt="GR Serviços Extrajudiciais & Registro de Marcas"
              className="size-10 shrink-0 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">GR Serviços Extrajudiciais</span>
              <span className="block truncate text-[11px] text-muted-foreground">Monitoramento Mensal MEI</span>
            </span>
          </Link>

          <nav className="col-span-2 flex flex-wrap items-center gap-1 sm:col-auto">
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/novo-cliente">
              <Plus className="size-3.5" /> Novo cliente
            </NavLink>
            <NavLink to="/configuracoes">
              <Settings className="size-3.5" /> Configurações
            </NavLink>
            <span className="ml-1 hidden h-6 w-px bg-border md:block" />
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground md:block">
              {session.email}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong"
            >
              <LogOut className="size-3.5" /> Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">GR Assessoria</strong> • @gr.assessoriadm •
          grjuridicoonline@gmail.com • (21) 96835-5063 • Responsável: Gabrielle Rocha
        </div>
      </footer>
    </div>
  );
}

export function PageHeading({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}