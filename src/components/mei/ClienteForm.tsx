import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import type { Cliente, StatusContrato } from "@/lib/mei/types";

export type ClienteDraft = Omit<Cliente, "id">;

export const emptyCliente: ClienteDraft = {
  nome: "",
  cnpj: "",
  cpf: "",
  atividade: "",
  cnae: "",
  cidade: "",
  telefone: "",
  email: "",
  valor_mensal: null,
  vencimento_dia: null,
  status_contrato: "ativo",
  tem_parcelamento: false,
  tem_guias: false,
  possui_faturamento: false,
  observacoes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium transition hover:bg-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}

export function ClienteForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: ClienteDraft;
  onSubmit: (c: ClienteDraft) => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ClienteDraft>(initial);
  const navigate = useNavigate();

  const set = <K extends keyof ClienteDraft>(k: K, v: ClienteDraft[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.nome.trim()) {
          toast.error("Informe o nome do cliente.");
          return;
        }
        onSubmit(form);
      }}
      className="space-y-6"
    >
      <section className="card-surface p-5">
        <h2 className="mb-4 text-sm font-bold tracking-wide uppercase">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome / Razão social *">
              <input className="field" value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
            </Field>
          </div>
          <Field label="CNPJ">
            <input className="field" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
          </Field>
          <Field label="CPF">
            <input className="field" value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
          </Field>
          <Field label="Atividade">
            <input className="field" value={form.atividade} onChange={(e) => set("atividade", e.target.value)} />
          </Field>
          <Field label="CNAE">
            <input className="field" value={form.cnae} onChange={(e) => set("cnae", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-sm font-bold tracking-wide uppercase">Contato</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cidade">
            <input className="field" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <input className="field" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </Field>
          <Field label="E-mail">
            <input
              className="field"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-sm font-bold tracking-wide uppercase">Contrato</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor mensal (R$)">
            <input
              className="field"
              type="number"
              step="0.01"
              value={form.valor_mensal ?? ""}
              onChange={(e) => set("valor_mensal", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Dia de vencimento">
            <input
              className="field"
              type="number"
              min={1}
              max={31}
              value={form.vencimento_dia ?? ""}
              onChange={(e) => set("vencimento_dia", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Status do contrato">
            <select
              className="field"
              value={form.status_contrato}
              onChange={(e) => set("status_contrato", e.target.value as StatusContrato)}
            >
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Toggle
            label="Possui parcelamento"
            checked={form.tem_parcelamento}
            onChange={(v) => set("tem_parcelamento", v)}
          />
          <Toggle label="Possui guias" checked={form.tem_guias} onChange={(v) => set("tem_guias", v)} />
          <Toggle
            label="Possui faturamento"
            checked={form.possui_faturamento}
            onChange={(v) => set("possui_faturamento", v)}
          />
        </div>
        <div className="mt-4">
          <Field label="Observações">
            <textarea
              className="field min-h-24"
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        >
          <Save className="size-4" /> {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </form>
  );
}