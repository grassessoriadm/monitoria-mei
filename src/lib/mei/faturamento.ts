import type { DB, Faturamento, SituacaoFaturamento } from "./types";

export const LIMITE_MEI_PADRAO = 81000;

export const MESES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const zerosAno = () => Array.from({ length: 12 }, () => 0);

export function limiteAnual(db: DB) {
  const v = db.config?.limite_anual_mei;
  return typeof v === "number" && v > 0 ? v : LIMITE_MEI_PADRAO;
}

export const SITUACAO_META: Record<SituacaoFaturamento, { label: string; dot: string; tone: string }> = {
  dentro: { label: "Dentro do limite", dot: "🟢", tone: "bg-ok-soft text-ok-strong" },
  atencao: { label: "Atenção", dot: "🟡", tone: "bg-warn-soft text-warn-strong" },
  proximo: { label: "Próximo do limite", dot: "🟠", tone: "bg-warn-soft text-warn-strong" },
  excedido: { label: "Limite excedido", dot: "🔴", tone: "bg-bad-soft text-bad-strong" },
};

/** Regra crítica de negócio: faixas de situação pelo % do limite anual utilizado. */
export function situacaoPorPercentual(pct: number): SituacaoFaturamento {
  if (pct > 100) return "excedido";
  if (pct >= 80) return "proximo";
  if (pct >= 50) return "atencao";
  return "dentro";
}

export interface LinhaFaturamento {
  mes: number;
  nome: string;
  valor: number;
  acumulado: number;
  limite: number;
  percentual: number;
  media: number;
  situacao: SituacaoFaturamento;
}

/**
 * Lógica original da planilha (não simplificar):
 * acumulado[i] = soma dos meses 0..i
 * percentual[i] = acumulado[i] / limite * 100
 * media[i]      = acumulado[i] / (i + 1)
 * situacao[i]   = faixa do percentual[i]
 */
export function calcularLinhas(meses: number[], limite: number): LinhaFaturamento[] {
  let acumulado = 0;
  return MESES_NOMES.map((nome, i) => {
    const valor = Number(meses[i] ?? 0) || 0;
    acumulado += valor;
    const percentual = limite > 0 ? (acumulado / limite) * 100 : 0;
    return {
      mes: i + 1,
      nome,
      valor,
      acumulado,
      limite,
      percentual,
      media: acumulado / (i + 1),
      situacao: situacaoPorPercentual(percentual),
    };
  });
}

export function resumoAno(meses: number[], limite: number) {
  const linhas = calcularLinhas(meses, limite);
  const ultima = linhas[11]!;
  const mesesComValor = meses.filter((m) => (Number(m) || 0) > 0).length;
  return {
    linhas,
    total: ultima.acumulado,
    percentual: ultima.percentual,
    media: mesesComValor > 0 ? ultima.acumulado / mesesComValor : 0,
    situacao: ultima.situacao,
  };
}

export function anoAtual() {
  return new Date().getFullYear();
}

export function getFaturamento(db: DB, clienteId: string, ano: number): Faturamento | undefined {
  return db.faturamentos?.find((f) => f.cliente_id === clienteId && f.ano === ano);
}

export function anosDoCliente(db: DB, clienteId: string): number[] {
  const anos = (db.faturamentos ?? []).filter((f) => f.cliente_id === clienteId).map((f) => f.ano);
  if (!anos.includes(anoAtual())) anos.push(anoAtual());
  return [...new Set(anos)].sort((a, b) => b - a);
}

/**
 * Garante que TODO cliente tenha planilha anual do ano corrente (e dos anos já
 * existentes em competências). Nenhum cliente pode existir sem essa estrutura.
 * Executado em toda leitura/gravação do banco — inclui a virada automática de ano.
 */
export function garantirFaturamentos(db: DB): DB {
  db.faturamentos ??= [];
  db.config ??= { limite_anual_mei: LIMITE_MEI_PADRAO };
  db.config.limite_anual_mei ??= LIMITE_MEI_PADRAO;

  const anos = new Set<number>([anoAtual()]);
  db.competencias?.forEach((c) => {
    const y = Number(c.competencia.slice(0, 4));
    if (Number.isFinite(y)) anos.add(y);
  });
  db.monitoramentos?.forEach((m) => {
    const y = Number(m.competencia.slice(0, 4));
    if (Number.isFinite(y)) anos.add(y);
  });

  const clienteIds = new Set(db.clientes.map((c) => c.id));
  db.faturamentos = db.faturamentos.filter((f) => clienteIds.has(f.cliente_id));

  db.clientes.forEach((cliente) => {
    anos.forEach((ano) => {
      let f = db.faturamentos.find((x) => x.cliente_id === cliente.id && x.ano === ano);
      if (!f) {
        f = { id: `fat-${cliente.id}-${ano}`, cliente_id: cliente.id, ano, meses: zerosAno() };
        db.faturamentos.push(f);
      }
      if (!Array.isArray(f.meses) || f.meses.length !== 12) f.meses = zerosAno();
      f.meses = f.meses.map((v) => Number(v) || 0);
    });
  });

  sincronizarMonitoramentos(db);
  return db;
}

/**
 * Fonte única da verdade: a planilha de faturamento.
 * Espelha os valores calculados nos campos do monitoramento mensal para que
 * tela, dashboard e PDF nunca divirjam.
 */
export function sincronizarMonitoramentos(db: DB) {
  const limite = limiteAnual(db);
  db.monitoramentos?.forEach((m) => {
    const ano = Number(m.competencia.slice(0, 4));
    const mes = Number(m.competencia.slice(5, 7));
    const f = db.faturamentos?.find((x) => x.cliente_id === m.cliente_id && x.ano === ano);
    if (!f || !mes) return;
    const linha = calcularLinhas(f.meses, limite)[mes - 1];
    if (!linha) return;
    m.dados_checklist ??= {};
    m.dados_checklist["faturamento_acum"] = {
      ...(m.dados_checklist["faturamento_acum"] ?? {}),
      faturamento_mes: String(linha.valor),
      faturamento_acumulado: String(linha.acumulado),
    };
  });
}

/** Grava o faturamento de um mês (1-12) e recalcula tudo que depende dele. */
export function setFaturamentoMes(db: DB, clienteId: string, ano: number, mes: number, valor: number) {
  garantirFaturamentos(db);
  const f = db.faturamentos.find((x) => x.cliente_id === clienteId && x.ano === ano);
  if (!f) return;
  f.meses[mes - 1] = Number(valor) || 0;
  sincronizarMonitoramentos(db);
}
