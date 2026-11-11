import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "./CurrencyInput";
import { StatusBadge } from "./StatusBadge";
import { formatBRL, formatCompetencia, uid } from "@/lib/mei/format";
import { useStore } from "@/lib/mei/store";
import type { Guia, GuiaTipo } from "@/lib/mei/types";

export function GuiasSection({
  tipo,
  clienteId,
  comp,
  readOnly,
}: {
  tipo: GuiaTipo;
  clienteId: string;
  comp: string;
  readOnly: boolean;
}) {
  const { db, update } = useStore();
  const guias = db.guias.filter((g) => g.cliente_id === clienteId && g.tipo === tipo);
  const total = guias.reduce((s, g) => s + (Number(g.valor) || 0), 0);

  const patch = (id: string, fn: (g: Guia) => void) =>
    update((d) => {
      const g = d.guias.find((x) => x.id === id);
      if (g) fn(g);
    });

  return (
    <section className="card-surface p-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-wide uppercase">Guias {tipo}</h2>
          <p className="text-xs text-muted-foreground">
            {guias.length} lançamento(s) • total {formatBRL(total)}
          </p>
        </div>
        <button
          disabled={readOnly}
          onClick={() =>
            update((d) => {
              d.guias.push({
                id: uid(),
                cliente_id: clienteId,
                tipo,
                competencia: comp,
                descricao: "",
                valor: 0,
                vencimento: "",
                status: "pendente",
                data_pago: null,
              });
            })
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-3.5" /> Nova guia {tipo}
        </button>
      </div>

      {guias.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma guia {tipo} registrada.
        </p>
      ) : (
        <div className="space-y-3">
          {guias.map((g) => (
            <div key={g.id} className="rounded-xl border border-border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                    {tipo}
                  </span>
                  <StatusBadge status={g.status} />
                </div>
                <button
                  disabled={readOnly}
                  onClick={() => update((d) => (d.guias = d.guias.filter((x) => x.id !== g.id)))}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong disabled:opacity-50"
                  title="Excluir guia"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                    Descrição / parcela
                  </span>
                  <input
                    className="field"
                    disabled={readOnly}
                    placeholder={tipo === "DARF" ? "Ex.: Parcela 3/12" : "Ex.: DAS mensal"}
                    value={g.descricao ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      patch(g.id, (x) => (x.descricao = v));
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Valor</span>
                  <CurrencyInput
                    disabled={readOnly}
                    value={g.valor}
                    onChange={(v) => patch(g.id, (x) => (x.valor = v ?? 0))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Vencimento</span>
                  <input
                    type="date"
                    className="field"
                    disabled={readOnly}
                    value={g.vencimento}
                    onChange={(e) => {
                      const v = e.target.value;
                      patch(g.id, (x) => (x.vencimento = v));
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Status</span>
                  <select
                    className="field"
                    disabled={readOnly}
                    value={g.status}
                    onChange={(e) => {
                      const v = e.target.value as Guia["status"];
                      patch(g.id, (x) => {
                        x.status = v;
                        x.data_pago = v === "paga" ? new Date().toISOString().slice(0, 10) : null;
                      });
                    }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="paga">Paga</option>
                    <option value="atrasada">Atrasada</option>
                  </select>
                </label>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Competência {formatCompetencia(g.competencia)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}