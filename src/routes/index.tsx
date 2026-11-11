import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Eye, FileText, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/mei/AppShell";
import { Donut, MiniProgress } from "@/components/mei/Donut";
import { StatusBadge } from "@/components/mei/StatusBadge";
import { useStore } from "@/lib/mei/store";
import { checklistCount, formatBRL, formatCompetencia } from "@/lib/mei/format";
import {
  anoAtual,
  getFaturamento,
  limiteAnual,
  resumoAno,
  zerosAno,
} from "@/lib/mei/faturamento";
import { gerarPDFCompetencia } from "@/lib/mei/pdf";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GR Assessoria | Monitoramento MEI" },
      {
        name: "description",
        content:
          "Visão geral do monitoramento mensal dos clientes MEI: status, checklist, pendências e relatórios da competência.",
      },
      { property: "og:title", content: "Dashboard — GR Assessoria | Monitoramento MEI" },
      {
        property: "og:description",
        content: "Acompanhe status, checklist e pendências de todos os clientes MEI ativos.",
      },
    ],
  }),
  component: Dashboard,
});

function MetricCard({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint?: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}) {
  const styles = {
    ok: "bg-ok-soft text-ok-strong",
    warn: "bg-warn-soft text-warn-strong",
    bad: "bg-bad-soft text-bad-strong",
    neutral: "bg-card",
  }[tone];
  return (
    <div className={`card-surface flex min-w-0 flex-col justify-center p-5 ${styles}`}>
      <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80 break-words">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums break-words">{value}</div>
      {hint && <div className="mt-0.5 text-xs opacity-80 break-words">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const { db, comp, setComp, update } = useStore();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const compObj = db.competencias.find((c) => c.competencia === comp);
  const isHistorico = !!compObj && !compObj.atual;

  const rows = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return db.clientes
      .filter((c) => c.status_contrato === "ativo")
      .map((cliente) => {
        const mon = db.monitoramentos.find((m) => m.cliente_id === cliente.id && m.competencia === comp);
        const { done, total } = checklistCount(mon);
        return {
          cliente,
          status_geral: mon?.status_geral ?? "vermelho",
          status_relatorio: mon?.status_relatorio ?? "nao_entregue",
          status_parcelamento: mon?.status_parcelamento ?? "sem_parcelamento",
          pendencias: mon?.pendencias ?? "",
          done,
          total,
        };
      })
      .filter(
        (r) =>
          !termo ||
          r.cliente.nome.toLowerCase().includes(termo) ||
          r.cliente.atividade.toLowerCase().includes(termo) ||
          r.cliente.cnpj.toLowerCase().includes(termo),
      );
  }, [db, comp, busca]);

  const feitos = rows.filter((r) => r.status_geral === "verde").length;
  const andamento = rows.filter((r) => r.status_geral === "amarelo").length;
  const naoIniciados = rows.filter((r) => r.status_geral === "vermelho").length;
  const totalDone = rows.reduce((s, r) => s + r.done, 0);
  const totalTasks = rows.reduce((s, r) => s + r.total, 0);

  const competencias = [...db.competencias].sort((a, b) => b.competencia.localeCompare(a.competencia));

  const fat = useMemo(() => {
    const ano = Number(comp.slice(0, 4)) || anoAtual();
    const limite = limiteAnual(db);
    const ativos = db.clientes.filter((c) => c.status_contrato === "ativo");
    const resumos = ativos.map((c) => ({
      cliente: c,
      ...resumoAno(getFaturamento(db, c.id, ano)?.meses ?? zerosAno(), limite),
    }));
    const total = resumos.reduce((s, r) => s + r.total, 0);
    const limiteTotal = limite * resumos.length;
    return {
      ano,
      limite,
      total,
      disponivel: resumos.reduce((s, r) => s + Math.max(0, limite - r.total), 0),
      pctUtilizado: limiteTotal > 0 ? (total / limiteTotal) * 100 : 0,
      mediaPct: resumos.length ? resumos.reduce((s, r) => s + r.percentual, 0) / resumos.length : 0,
    };
  }, [db, comp]);


  function excluirCliente(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? Todos os dados de monitoramento serão removidos.`)) return;
    update((d) => {
      d.clientes = d.clientes.filter((c) => c.id !== id);
      d.monitoramentos = d.monitoramentos.filter((m) => m.cliente_id !== id);
      d.parcelamentos = d.parcelamentos.filter((p) => p.cliente_id !== id);
      d.guias = d.guias.filter((g) => g.cliente_id !== id);
    });
    toast.success("Cliente excluído.");
  }

  return (
    <AppShell>
      <PageHeading
        title="Dashboard Central"
        subtitle="Visão geral do monitoramento mensal dos clientes ativos"
        actions={
          <>
            <button
              onClick={() => navigate({ to: "/novo-cliente" })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            >
              <Plus className="size-4" /> Novo cliente
            </button>
            <button
              onClick={() => gerarPDFCompetencia(db, comp)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              <FileText className="size-4" /> Relatório geral
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <select value={comp} onChange={(e) => setComp(e.target.value)} className="field w-auto pl-9 font-semibold">
            {competencias.map((c) => (
              <option key={c.competencia} value={c.competencia}>
                {formatCompetencia(c.competencia)}
                {c.atual ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field pl-9"
            placeholder="Buscar cliente, atividade, CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {isHistorico && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn-strong">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Mês histórico ({formatCompetencia(comp)}).</strong> As edições estão bloqueadas — os dados foram
            preservados na virada do mês.
          </span>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface flex items-center gap-4 p-5">
          <Donut done={totalDone} total={totalTasks} />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Progresso geral</div>
            <div className="text-xs text-muted-foreground">
              {totalDone} de {totalTasks} tarefas concluídas
            </div>
          </div>
        </div>
        <div className="card-surface flex min-w-0 flex-col justify-center p-5">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Status geral</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ok-strong">Regular</span>
              <span className="font-bold tabular-nums">{feitos}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-warn-strong">Em regularização</span>
              <span className="font-bold tabular-nums">{andamento}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-bad-strong">Irregular</span>
              <span className="font-bold tabular-nums">{naoIniciados}</span>
            </div>
          </div>
        </div>
        <MetricCard
          label="Limite disponível"
          value={formatBRL(fat.disponivel)}
          hint={`Soma dos clientes ativos • ${formatBRL(fat.limite)}/cliente`}
          tone="ok"
        />
        <MetricCard
          label="% do limite utilizado"
          value={`${fat.pctUtilizado.toFixed(2).replace(".", ",")}%`}
          hint={`Faturado no ano: ${formatBRL(fat.total)}`}
          tone={fat.pctUtilizado >= 100 ? "bad" : fat.pctUtilizado >= 80 ? "warn" : "neutral"}
        />
      </div>

      <div className="card-surface mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide uppercase">Controle de Faturamento — {fat.ano}</h2>
          <span className="text-xs text-muted-foreground">Limite anual MEI: {formatBRL(fat.limite)}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-muted px-4 py-3">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Total faturado no ano
            </div>
            <div className="text-xl font-bold tabular-nums">{formatBRL(fat.total)}</div>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Limite disponível
            </div>
            <div className="text-xl font-bold tabular-nums">{formatBRL(fat.disponivel)}</div>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              % do limite utilizado
            </div>
            <div className="text-xl font-bold tabular-nums">
              {fat.pctUtilizado.toFixed(2).replace(".", ",")}%
            </div>
          </div>
        </div>
      </div>


      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
          <span className="text-sm font-semibold">Clientes ativos — {formatCompetencia(comp)}</span>
          <span className="text-xs text-muted-foreground">{rows.length} cliente(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">CNPJ</th>
                <th className="px-4 py-3 font-semibold">Status geral</th>
                <th className="px-4 py-3 font-semibold">Relatório</th>
                <th className="px-4 py-3 font-semibold">Parcelamento</th>
                <th className="px-4 py-3 font-semibold">Checklist</th>
                <th className="px-4 py-3 font-semibold">Pend.</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.cliente.id}
                  onClick={() => navigate({ to: "/cliente/$clienteId", params: { clienteId: r.cliente.id } })}
                  className="cursor-pointer border-b border-border/70 transition last:border-0 hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.cliente.nome}</div>
                    <div className="text-xs text-muted-foreground">{r.cliente.atividade}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.cliente.cnpj || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status_geral} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status_relatorio} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status_parcelamento} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MiniProgress done={r.done} total={r.total} />
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {r.done}/{r.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.pendencias ? (
                      <TriangleAlert className="size-4 text-bad" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Abrir"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/cliente/$clienteId", params: { clienteId: r.cliente.id } });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/editar-cliente/$clienteId", params: { clienteId: r.cliente.id } });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        title="Excluir"
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirCliente(r.cliente.id, r.cliente.nome);
                        }}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado{busca ? ` para "${busca}"` : ""}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
