import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CurrencyInput } from "./CurrencyInput";
import { Pill } from "./StatusBadge";
import { formatBRL, uid } from "@/lib/mei/format";
import { useStore } from "@/lib/mei/store";
import type { GuiaTipo, Parcelamento } from "@/lib/mei/types";

const hoje = () => new Date().toISOString().slice(0, 10);

export function ParcelamentosSection({
  clienteId,
  comp,
  readOnly,
}: {
  clienteId: string;
  comp: string;
  readOnly: boolean;
}) {
  const { db, update } = useStore();
  const parcelamentos = db.parcelamentos.filter((p) => p.cliente_id === clienteId);

  const patch = (id: string, fn: (p: Parcelamento) => void) =>
    update((d) => {
      const p = d.parcelamentos.find((x) => x.id === id);
      if (!p) return;
      fn(p);
      p.total_parcelas = p.parcelas.length;
      p.valor_total = p.parcelas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
    });

  function novoParcelamento(tipo: GuiaTipo) {
    update((d) => {
      d.parcelamentos.push({
        id: uid(),
        cliente_id: clienteId,
        tipo,
        descricao: `Parcelamento ${tipo}`,
        competencia_origem: comp,
        total_parcelas: 1,
        valor_total: 0,
        parcelas: [{ n: 1, valor: 0, vencimento: "", pago: false, data_pago: null }],
      });
    });
    toast.success(`Parcelamento ${tipo} criado.`);
  }

  return (
    <section className="card-surface p-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-wide uppercase">Parcelamentos</h2>
          <p className="text-xs text-muted-foreground">
            Número de parcelas livre — adicione ou remova quantas precisar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            disabled={readOnly}
            onClick={() => novoParcelamento("DAS")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
          >
            <Plus className="size-3.5" /> DAS (Simples)
          </button>
          <button
            disabled={readOnly}
            onClick={() => novoParcelamento("DARF")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
          >
            <Plus className="size-3.5" /> DARF
          </button>
        </div>
      </div>

      {parcelamentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum parcelamento registrado.</p>
      ) : (
        <div className="space-y-6">
          {parcelamentos.map((p) => {
            const pagas = p.parcelas.filter((x) => x.pago).length;
            const quitado = p.parcelas.length > 0 && pagas === p.parcelas.length;
            return (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                        {p.tipo ?? "DAS"}
                      </span>
                      <Pill tone={quitado ? "green" : "yellow"}>{quitado ? "Quitado" : "Em andamento"}</Pill>
                    </div>
                    <input
                      className="field mt-2"
                      disabled={readOnly}
                      value={p.descricao}
                      placeholder="Descrição do parcelamento"
                      onChange={(e) => {
                        const v = e.target.value;
                        patch(p.id, (x) => (x.descricao = v));
                      }}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatBRL(p.valor_total)} • {pagas}/{p.parcelas.length} parcelas pagas
                    </p>
                  </div>
                  <button
                    disabled={readOnly}
                    onClick={() => {
                      if (!confirm(`Excluir "${p.descricao}"?`)) return;
                      update((d) => (d.parcelamentos = d.parcelamentos.filter((x) => x.id !== p.id)));
                      toast.success("Parcelamento excluído.");
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong disabled:opacity-50"
                    title="Excluir parcelamento"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {p.parcelas.map((pa) => (
                    <div
                      key={pa.n}
                      className={`grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr_1fr_auto_auto] ${
                        pa.pago ? "border-ok/40 bg-ok-soft/40" : "border-border bg-card"
                      }`}
                    >
                      <span className="text-xs font-bold whitespace-nowrap sm:pb-2.5">
                        {pa.n}/{p.parcelas.length}
                      </span>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Valor</span>
                        <CurrencyInput
                          disabled={readOnly}
                          value={pa.valor}
                          onChange={(v) =>
                            patch(p.id, (x) => {
                              const alvo = x.parcelas.find((i) => i.n === pa.n);
                              if (alvo) alvo.valor = v ?? 0;
                            })
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                          Vencimento
                        </span>
                        <input
                          type="date"
                          className="field"
                          disabled={readOnly}
                          value={pa.vencimento}
                          onChange={(e) => {
                            const v = e.target.value;
                            patch(p.id, (x) => {
                              const alvo = x.parcelas.find((i) => i.n === pa.n);
                              if (alvo) alvo.vencimento = v;
                            });
                          }}
                        />
                      </label>
                      <button
                        disabled={readOnly}
                        onClick={() =>
                          patch(p.id, (x) => {
                            const alvo = x.parcelas.find((i) => i.n === pa.n);
                            if (!alvo) return;
                            alvo.pago = !alvo.pago;
                            alvo.data_pago = alvo.pago ? hoje() : null;
                          })
                        }
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                          pa.pago ? "bg-ok-soft text-ok-strong" : "border border-border bg-card hover:bg-muted"
                        }`}
                      >
                        {pa.pago ? "Paga" : "Marcar paga"}
                      </button>
                      <button
                        disabled={readOnly}
                        onClick={() =>
                          patch(p.id, (x) => {
                            x.parcelas = x.parcelas
                              .filter((i) => i.n !== pa.n)
                              .map((i, idx) => ({ ...i, n: idx + 1 }));
                          })
                        }
                        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-bad-soft hover:text-bad-strong disabled:opacity-50"
                        title="Excluir parcela"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  disabled={readOnly}
                  onClick={() =>
                    patch(p.id, (x) => {
                      x.parcelas.push({
                        n: x.parcelas.length + 1,
                        valor: 0,
                        vencimento: "",
                        pago: false,
                        data_pago: null,
                      });
                    })
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                >
                  <Plus className="size-3.5" /> Adicionar parcela
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}