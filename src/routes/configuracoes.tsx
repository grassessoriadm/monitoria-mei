import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Download, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { AppShell, PageHeading } from "@/components/mei/AppShell";
import { loadUsers, saveUsers, useStore } from "@/lib/mei/store";
import { competenciaAtual, formatBRL, formatCompetencia, nowISO, uid } from "@/lib/mei/format";
import { CurrencyInput } from "@/components/mei/CurrencyInput";
import { LIMITE_MEI_PADRAO, limiteAnual } from "@/lib/mei/faturamento";

import { buildSeedData } from "@/lib/mei/seed";
import type { Usuario } from "@/lib/mei/types";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — GR Assessoria" },
      {
        name: "description",
        content: "Gerencie competências, usuários e backup dos dados do monitoramento mensal MEI.",
      },
      { property: "og:title", content: "Configurações — GR Assessoria" },
      { property: "og:description", content: "Competências, usuários e backup do sistema de monitoramento MEI." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { db, update, comp, setComp } = useStore();
  const [users, setUsers] = useState<Usuario[]>(() => (typeof window === "undefined" ? [] : loadUsers()));
  const [novo, setNovo] = useState({ nome: "", email: "", senha: "" });

  const competencias = [...db.competencias].sort((a, b) => b.competencia.localeCompare(a.competencia));

  function abrirNovaCompetencia() {
    const atual = competenciaAtual();
    if (db.competencias.some((c) => c.competencia === atual)) {
      toast.info("A competência atual já está aberta.");
      return;
    }
    update((d) => {
      d.competencias.forEach((c) => (c.atual = false));
      d.competencias.push({ id: "c-" + atual, competencia: atual, referencia: formatCompetencia(atual), atual: true });
      d.clientes
        .filter((c) => c.status_contrato === "ativo")
        .forEach((c) => {
          d.monitoramentos.push({
            id: uid(),
            cliente_id: c.id,
            competencia: atual,
            status_geral: "vermelho",
            status_relatorio: "nao_entregue",
            status_parcelamento: c.tem_parcelamento ? "em_parcelamento" : "sem_parcelamento",
            checklist: {},
            dados_checklist: {},
            pendencias: "",
            alertas: "",
            updated_at: nowISO(),
          });
        });
    });
    setComp(atual);
    toast.success(`Competência ${formatCompetencia(atual)} aberta.`);
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `backup-gr-assessoria-${competenciaAtual()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <AppShell>
      <PageHeading title="Configurações" subtitle="Competências, usuários e backup dos dados" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-1 text-sm font-bold tracking-wide uppercase">Competências</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Ao abrir uma nova competência, os meses anteriores viram histórico somente leitura.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {competencias.map((c) => (
              <button
                key={c.competencia}
                onClick={() => setComp(c.competencia)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  c.competencia === comp
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:bg-brand-soft hover:text-brand"
                }`}
              >
                {formatCompetencia(c.competencia)}
                {c.atual ? " • atual" : ""}
              </button>
            ))}
          </div>
          <button
            onClick={abrirNovaCompetencia}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            <CalendarPlus className="size-4" /> Abrir competência atual
          </button>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-1 text-sm font-bold tracking-wide uppercase">Usuários</h2>
          <p className="mb-4 text-xs text-muted-foreground">Acessos ao painel de monitoramento.</p>
          <ul className="mb-4 divide-y divide-border">
            {users.map((u) => (
              <li key={u.email} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{u.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                </span>
                {users.length > 1 && (
                  <button
                    onClick={() => {
                      const next = users.filter((x) => x.email !== u.email);
                      saveUsers(next);
                      setUsers(next);
                      toast.success("Usuário removido.");
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (users.some((u) => u.email === novo.email)) {
                toast.error("E-mail já cadastrado.");
                return;
              }
              const next = [...users, { ...novo }];
              saveUsers(next);
              setUsers(next);
              setNovo({ nome: "", email: "", senha: "" });
              toast.success("Usuário adicionado.");
            }}
            className="grid gap-3 sm:grid-cols-3"
          >
            <input
              className="field"
              placeholder="Nome"
              required
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            />
            <input
              className="field"
              type="email"
              placeholder="E-mail"
              required
              value={novo.email}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
            />
            <input
              className="field"
              type="password"
              placeholder="Senha"
              required
              value={novo.senha}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
            />
            <div className="sm:col-span-3">
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold transition hover:bg-muted">
                <UserPlus className="size-4" /> Adicionar usuário
              </button>
            </div>
          </form>
        </section>

        <section className="card-surface p-5 lg:col-span-2">
          <h2 className="mb-1 text-sm font-bold tracking-wide uppercase">Limite anual MEI</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Valor usado em todo o Controle de Faturamento (tabela, dashboard e PDF). Ajuste caso a legislação do MEI
            mude.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Limite anual (R$)</span>
              <CurrencyInput
                className="w-48"
                value={limiteAnual(db)}
                onChange={(v) =>
                  update((d) => {
                    d.config.limite_anual_mei = v && v > 0 ? v : LIMITE_MEI_PADRAO;
                  })
                }
              />
            </label>
            <span className="pb-2.5 text-xs text-muted-foreground">Padrão vigente: {formatBRL(LIMITE_MEI_PADRAO)}</span>
          </div>
        </section>


        <section className="card-surface p-5 lg:col-span-2">
          <h2 className="mb-1 text-sm font-bold tracking-wide uppercase">Dados</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Os dados ficam salvos neste navegador. Faça backups periódicos.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportar}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              <Download className="size-4" /> Exportar backup (JSON)
            </button>
            <button
              onClick={() => {
                if (!confirm("Restaurar os dados de demonstração? Todas as alterações serão perdidas.")) return;
                const seed = buildSeedData();
                update((d) => {
                  d.clientes = seed.clientes;
                  d.monitoramentos = seed.monitoramentos;
                  d.parcelamentos = seed.parcelamentos;
                  d.guias = seed.guias;
                  d.competencias = seed.competencias;
                  d.faturamentos = seed.faturamentos;
                  d.config = seed.config;

                });
                toast.success("Dados de demonstração restaurados.");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-bad-strong transition hover:bg-bad-soft"
            >
              <RotateCcw className="size-4" /> Restaurar dados de exemplo
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}