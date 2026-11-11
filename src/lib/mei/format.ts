import { CHECKLIST_ITEMS } from "./constants";
import type { Monitoramento } from "./types";

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function nowISO() {
  return new Date().toISOString();
}

export function uid() {
  return "id-" + Math.random().toString(36).slice(2, 10);
}

export function competenciaAtual() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function formatCompetencia(comp?: string | null) {
  if (!comp) return "—";
  const [y, m] = comp.split("-");
  return `${MESES[parseInt(m ?? "1", 10) - 1]}/${y}`;
}

export function formatBRL(v: number | string | null | undefined) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function checklistCount(mon?: Pick<Monitoramento, "checklist"> | null) {
  const total = CHECKLIST_ITEMS.length;
  if (!mon?.checklist) return { done: 0, total };
  const done = CHECKLIST_ITEMS.filter((c) => mon.checklist[c.key]).length;
  return { done, total };
}

export function statusGeralAuto(mon: Pick<Monitoramento, "checklist">) {
  const { done, total } = checklistCount(mon);
  if (done === total) return "verde" as const;
  if (done === 0) return "vermelho" as const;
  return "amarelo" as const;
}