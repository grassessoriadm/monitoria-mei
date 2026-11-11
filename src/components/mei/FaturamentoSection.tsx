import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { CurrencyInput } from "@/components/mei/CurrencyInput";
import { useStore } from "@/lib/mei/store";
import { formatBRL } from "@/lib/mei/format";
import {
  SITUACAO_META,
  anoAtual,
  anosDoCliente,
  calcularLinhas,
  getFaturamento,
  limiteAnual,
  resumoAno,
  setFaturamentoMes,
  zerosAno,
} from "@/lib/mei/faturamento";

export function FaturamentoSection({ clienteId }: { clienteId: string }) {
  const { db, update } = useStore();
  const anos = anosDoCliente(db, clienteId);
  const [ano, setAno] = useState<number>(anos[0] ?? anoAtual());

  const limite = limiteAnual(db);
  const meses = getFaturamento(db, clienteId, ano)?.meses ?? zerosAno();
  const linhas = calcularLinhas(meses, limite);
  const resumo = resumoAno(meses, limite);
  const meta = SITUACAO_META[resumo.situacao];

  return (
    <section className="card-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          <TrendingUp className="size-4 text-brand" /> Controle de Faturamento
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {anos.map((a) => (
            <button
              key={a}
              onClick={() => setAno(a)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                a === ano ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:bg-brand-soft"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-muted px-3.5 py-3">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Total no ano</div>
          <div className="text-base font-bold tabular-nums">{formatBRL(resumo.total)}</div>
        </div>
        <div className="rounded-xl bg-muted px-3.5 py-3">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Limite anual</div>
          <div className="text-base font-bold tabular-nums">{formatBRL(limite)}</div>
        </div>
        <div className="rounded-xl bg-muted px-3.5 py-3">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">% utilizado</div>
          <div className="text-base font-bold tabular-nums">{resumo.percentual.toFixed(1)}%</div>
        </div>
        <div className={`rounded-xl px-3.5 py-3 ${meta.tone}`}>
          <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80">Situação</div>
          <div className="text-sm font-bold">
            {meta.dot} {meta.label}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-3 py-2.5 font-semibold">Mês</th>
              <th className="px-3 py-2.5 font-semibold">Faturamento do mês</th>
              <th className="px-3 py-2.5 text-right font-semibold">Acumulado no ano</th>
              <th className="px-3 py-2.5 text-right font-semibold">Limite anual MEI</th>
              <th className="px-3 py-2.5 text-right font-semibold">% do limite</th>
              <th className="px-3 py-2.5 text-right font-semibold">Média mensal</th>
              <th className="px-3 py-2.5 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const m = SITUACAO_META[l.situacao];
              return (
                <tr key={l.mes} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{l.nome}</td>
                  <td className="px-3 py-2">
                    <CurrencyInput
                      className="min-w-32"
                      value={l.valor}
                      onChange={(v) => update((d) => setFaturamentoMes(d, clienteId, ano, l.mes, v ?? 0))}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(l.acumulado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatBRL(l.limite)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{l.percentual.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(l.media)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${m.tone}`}>
                      {m.dot} {m.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Todos os cálculos são automáticos e sincronizados com o monitoramento mensal, o dashboard e o relatório em PDF.
      </p>
    </section>
  );
}
