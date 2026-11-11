import { useState, type FormEvent } from "react";
import { Eye, EyeOff, BarChart3, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/mei/store";

export function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const [erro, setErro] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!login(email.trim(), senha)) setErro("E-mail ou senha incorretos. Verifique e tente novamente.");
    else setErro("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,var(--brand-soft),var(--background))] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lift">
            <BarChart3 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GR Assessoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sistema de Monitoramento Mensal MEI</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface space-y-4 p-6" autoComplete="off">
          <div>
            <h2 className="text-base font-semibold">Acessar sistema</h2>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              className="field"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="senha">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={show ? "text" : "password"}
                required
                className="field pr-10"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Mostrar senha"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad-strong">{erro}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 active:scale-[0.99]"
          >
            Entrar
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Acesso restrito à equipe GR
          </p>
        </form>
      </div>
    </div>
  );
}