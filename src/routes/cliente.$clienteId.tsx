import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Pencil } from "lucide-react";
import { AppShell, PageHeading } from "@/components/mei/AppShell";
import { Donut } from "@/components/mei/Donut";
import { StatusBadge } from "@/components/mei/StatusBadge";
import { GuiasSection } from "@/components/mei/GuiasSection";
import { FaturamentoSection } from "@/components/mei/FaturamentoSection";
import { ParcelamentosSection } from "@/components/mei/ParcelamentosSection";

import { useStore } from "@/lib/mei/store";
import {
  CHECKLIST_ITEMS,
  STATUS_GERAL_OPS,
  STATUS_PARCELAMENTO_OPS,
  STATUS_RELATORIO_OPS,
  statusLabel,
} from "@/lib/mei/constants";
import { checklistCount, formatBRL, formatCompetencia, nowISO, uid } from "@/lib/mei/format";
import { CurrencyInput } from "@/components/mei/CurrencyInput";
import { calcularLinhas, getFaturamento, limiteAnual, setFaturamentoMes, zerosAno } from "@/lib/mei/faturamento";
import { gerarPDFCliente } from "@/lib/mei/pdf";
import type { Monitoramento } from "@/lib/mei/types";


export const Route = createFileRoute("/cliente/$clienteId")({
  head: () => ({
    meta: [
      { title: "Cliente — GR Assessoria | Monitoramento MEI" },
      {
        name: "description",
        content: "Checklist mensal, guias DAS/DARF, parcelamentos e relatório em PDF do cliente MEI.",
      },
      { property: "og:title", content: "Cliente — GR Assessoria | Monitoramento MEI" },
      { property: "og:description", content: "Checklist mensal, guias, parcelamentos e relatório do cliente MEI." },
    ],
  }),
  component: ClienteDetalhe,
});

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="truncate text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function ClienteDetalhe() {
  const { clienteId } = useParams({ from: "/cliente/$clienteId" });
  const { db, comp, update } = useStore();

  const cliente = db.clientes.find((c) => c.id === clienteId);
  const mon = db.monitoramentos.find((m) => m.cliente_id === clienteId && m.competencia === comp);
  const compObj = db.competencias.find((c) => c.competencia === comp);
  const readOnly = !!compObj && !compObj.atual;

  if (!cliente) {
    return (
      <AppShell>
        <PageHeading title="Cliente não encontrado" subtitle="O registro pode ter sido removido." />
        <Link to="/" className="text-sm font-semibold text-brand">
          Voltar ao dashboard
        </Link>
      </AppShell>
    );
  }

  function withMon(fn: (m: Monitoramento) => void) {
    if (readOnly) {
      toast.error("Competência histórica: edição bloqueada.");
      return;
    }
    update((d) => {
      let m = d.monitoramentos.find((x) => x.cliente_id === clienteId && x.competencia === comp);
      if (!m) {
        m = {
          id: uid(),
          cliente_id: clienteId,
          competencia: comp,
          status_geral: "vermelho",
          status_relatorio: "nao_entregue",
          status_parcelamento: "sem_parcelamento",
          checklist: {},
          dados_checklist: {},
          pendencias: "",
          alertas: "",
          updated_at: nowISO(),
        };
        d.monitoramentos.push(m);
      }
      fn(m);
      // O Status Geral é definido apenas pelo usuário — o checklist não o altera.
      m.updated_at = nowISO();
    });
  }

  const { done, total } = checklistCount(mon);

  const anoComp = Number(comp.slice(0, 4));
  const mesComp = Number(comp.slice(5, 7));
  const mesesFat = getFaturamento(db, clienteId, anoComp)?.meses ?? zerosAno();
  const linhaFaturamento = calcularLinhas(mesesFat, limiteAnual(db))[mesComp - 1];


  return (
    <AppShell>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-brand"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <PageHeading
        title={cliente.nome}
        subtitle={`${cliente.atividade || "Cliente MEI"} • Competência ${formatCompetencia(comp)}`}
        actions={
          <>
            <button
              onClick={() => gerarPDFCliente(db, clienteId, comp)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            >
              <FileText className="size-4" /> Relatório PDF
            </button>
            <Link
              to="/editar-cliente/$clienteId"
              params={{ clienteId }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              <Pencil className="size-4" /> Editar
            </Link>
          </>
        }
      />

      {readOnly && (
        <div className="mb-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn-strong">
          Competência histórica — os dados estão em modo somente leitura.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="mb-4 text-sm font-bold tracking-wide uppercase">Dados cadastrais</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoItem label="CNPJ" value={cliente.cnpj} />
              <InfoItem label="CPF" value={cliente.cpf} />
              <InfoItem label="CNAE" value={cliente.cnae} />
              <InfoItem label="Cidade" value={cliente.cidade} />
              <InfoItem label="Telefone" value={cliente.telefone} />
              <InfoItem label="E-mail" value={cliente.email} />
              <InfoItem label="Valor mensal" value={formatBRL(cliente.valor_mensal)} />
              <InfoItem label="Vencimento" value={cliente.vencimento_dia ? `Dia ${cliente.vencimento_dia}` : "—"} />
              <InfoItem label="Contrato" value={statusLabel(cliente.status_contrato)} />
            </div>
            {cliente.observacoes && (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{cliente.observacoes}</p>
            )}
          </section>

          <section className="card-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold tracking-wide uppercase">Checklist de monitoramento</h2>
              <span className="text-xs text-muted-foreground">
                {done} de {total} concluídos
              </span>
            </div>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => {
                const marcado = !!mon?.checklist?.[item.key];
                const dados = mon?.dados_checklist?.[item.key] ?? {};
                return (
                  <div
                    key={item.key}
                    className={`rounded-xl border p-4 transition ${
                      marcado ? "border-ok/40 bg-ok-soft/40" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        disabled={readOnly}
                        onClick={() => withMon((m) => (m.checklist[item.key] = !m.checklist[item.key]))}
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${
                          marcado ? "border-ok bg-ok text-white" : "border-border bg-card hover:border-brand"
                        }`}
                      >
                        {marcado && <Check className="size-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                        {item.campos.length > 0 && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {item.campos.map((campo) => {
                              const sincronizado =
                                item.key === "faturamento_acum" &&
                                (campo.key === "faturamento_mes" || campo.key === "faturamento_acumulado");

                              if (sincronizado) {
                                const valor =
                                  campo.key === "faturamento_mes" ? linhaFaturamento?.valor : linhaFaturamento?.acumulado;
                                return (
                                  <label key={campo.key} className="block">
                                    <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                                      {campo.label}
                                    </span>
                                    {campo.key === "faturamento_mes" ? (
                                      <CurrencyInput
                                        value={valor ?? 0}
                                        disabled={readOnly}
                                        onChange={(v) =>
                                          update((d) =>
                                            setFaturamentoMes(d, clienteId, anoComp, mesComp, v ?? 0),
                                          )
                                        }
                                      />
                                    ) : (
                                      <input className="field" readOnly value={formatBRL(valor ?? 0)} />
                                    )}
                                    <span className="mt-1 block text-[10px] text-muted-foreground">
                                      Sincronizado com o Controle de Faturamento
                                    </span>
                                  </label>
                                );
                              }

                              return (
                                <label key={campo.key} className="block">
                                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                                    {campo.label}
                                  </span>
                                  <input
                                    className="field"
                                    type={campo.type === "text" ? "text" : campo.type}
                                    step={campo.type === "number" ? "0.01" : undefined}
                                    disabled={readOnly}
                                    value={dados[campo.key] ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      withMon((m) => {
                                        m.dados_checklist[item.key] ??= {};
                                        m.dados_checklist[item.key]![campo.key] = v;
                                      });
                                    }}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <FaturamentoSection clienteId={clienteId} />

          <GuiasSection tipo="DAS" clienteId={clienteId} comp={comp} readOnly={readOnly} />

          <GuiasSection tipo="DARF" clienteId={clienteId} comp={comp} readOnly={readOnly} />

          <ParcelamentosSection clienteId={clienteId} comp={comp} readOnly={readOnly} />

        </div>

        <aside className="space-y-6">
          <section className="card-surface flex flex-col items-center gap-3 p-5">
            <Donut done={done} total={total} />
            <StatusBadge status={mon?.status_geral ?? "vermelho"} />
            <p className="text-center text-xs text-muted-foreground">
              Progresso do checklist. O status geral é definido manualmente em “Situação do mês”.
            </p>
          </section>

          <section className="card-surface space-y-4 p-5">
            <h2 className="text-sm font-bold tracking-wide uppercase">Situação do mês</h2>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Status geral</span>
              <select
                className="field"
                disabled={readOnly}
                value={mon?.status_geral ?? "vermelho"}
                onChange={(e) =>
                  update((d) => {
                    const m = d.monitoramentos.find((x) => x.cliente_id === clienteId && x.competencia === comp);
                    if (m) m.status_geral = e.target.value as typeof m.status_geral;
                  })
                }
              >
                {STATUS_GERAL_OPS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Relatório</span>
              <select
                className="field"
                disabled={readOnly}
                value={mon?.status_relatorio ?? "nao_entregue"}
                onChange={(e) => withMon((m) => (m.status_relatorio = e.target.value as typeof m.status_relatorio))}
              >
                {STATUS_RELATORIO_OPS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Parcelamento</span>
              <select
                className="field"
                disabled={readOnly}
                value={mon?.status_parcelamento ?? "sem_parcelamento"}
                onChange={(e) =>
                  withMon((m) => (m.status_parcelamento = e.target.value as typeof m.status_parcelamento))
                }
              >
                {STATUS_PARCELAMENTO_OPS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Pendências</span>
              <textarea
                className="field min-h-20"
                disabled={readOnly}
                value={mon?.pendencias ?? ""}
                onChange={(e) => withMon((m) => (m.pendencias = e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Alertas</span>
              <textarea
                className="field min-h-20"
                disabled={readOnly}
                value={mon?.alertas ?? ""}
                onChange={(e) => withMon((m) => (m.alertas = e.target.value))}
              />
            </label>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}