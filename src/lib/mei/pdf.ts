import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CHECKLIST_ITEMS, statusLabel } from "./constants";
import { checklistCount, formatBRL, formatCompetencia, formatDateBR } from "./format";
import {
  SITUACAO_META,
  calcularLinhas,
  getFaturamento,
  limiteAnual,
  resumoAno,
  zerosAno,
} from "./faturamento";

import { LOGO_GR_PNG } from "./logo";
import { gerarNarrativa, separarChecklist, type Narrativa } from "./narrativa";
import type { DB } from "./types";

type RGB = [number, number, number];

/* ===== Identidade visual GR ===== */
const MARSALA: RGB = [128, 43, 56];
const MARSALA_ESC: RGB = [90, 28, 38];
const MARSALA_CLARO: RGB = [186, 122, 133];
const OFFWHITE: RGB = [250, 246, 243];
const BRANCO: RGB = [255, 255, 255];
const CINZA_CLARO: RGB = [233, 229, 226];
const CINZA_LINHA: RGB = [224, 218, 214];
const GRAFITE: RGB = [38, 42, 48];
const SLATE: RGB = [110, 118, 128];

const VERDE: RGB = [34, 122, 84];
const VERDE_SOFT: RGB = [226, 242, 234];
const AMBAR: RGB = [176, 118, 20];
const AMBAR_SOFT: RGB = [253, 241, 219];
const VERMELHO: RGB = [176, 48, 48];
const VERMELHO_SOFT: RGB = [251, 232, 232];
const NEUTRO_SOFT: RGB = [238, 236, 234];

const PW = 210; // largura A4
const ML = 14; // margem esquerda
const MR = 196; // margem direita

const EMPRESA = "GR Serviços Extrajudiciais & Registro de Marcas";
const CONTATO = "@gr.assessoriadm  •  grjuridicoonline@gmail.com  •  (21) 96835-5063";

function toneCores(tone: "green" | "yellow" | "red" | "neutral"): { fg: RGB; bg: RGB } {
  if (tone === "green") return { fg: VERDE, bg: VERDE_SOFT };
  if (tone === "yellow") return { fg: AMBAR, bg: AMBAR_SOFT };
  if (tone === "red") return { fg: VERMELHO, bg: VERMELHO_SOFT };
  return { fg: SLATE, bg: NEUTRO_SOFT };
}

const TONE_STATUS: Record<string, "green" | "yellow" | "red" | "neutral"> = {
  verde: "green",
  amarelo: "yellow",
  vermelho: "red",
  aprovado: "green",
  entregue: "yellow",
  nao_entregue: "red",
  quitado: "green",
  em_parcelamento: "yellow",
  sem_parcelamento: "neutral",
  ativo: "green",
  suspenso: "yellow",
  encerrado: "neutral",
  paga: "green",
  pendente: "yellow",
  atrasada: "red",
};

const SITUACAO_TONE: Record<string, "green" | "yellow" | "red" | "neutral"> = {
  dentro: "green",
  atencao: "yellow",
  proximo: "yellow",
  excedido: "red",
};

/* ===== Primitivas de desenho ===== */

function card(doc: jsPDF, x: number, y: number, w: number, h: number, fill: RGB = BRANCO) {
  doc.setFillColor(...CINZA_LINHA);
  doc.roundedRect(x, y + 0.6, w, h, 2.6, 2.6, "F");
  doc.setFillColor(...fill);
  doc.setDrawColor(...CINZA_LINHA);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2.6, 2.6, "FD");
}

function badge(doc: jsPDF, x: number, y: number, texto: string, tone: "green" | "yellow" | "red" | "neutral") {
  const { fg, bg } = toneCores(tone);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(texto) + 6;
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, w, 6, 3, 3, "F");
  doc.setFillColor(...fg);
  doc.circle(x + 3, y + 3, 1.05, "F");
  doc.setTextColor(...fg);
  doc.text(texto, x + 5.4, y + 4.1);
  return w;
}

function progresso(doc: jsPDF, x: number, y: number, w: number, pct: number, cor: RGB) {
  const p = Math.max(0, Math.min(100, pct));
  doc.setFillColor(...CINZA_CLARO);
  doc.roundedRect(x, y, w, 4, 2, 2, "F");
  if (p > 0) {
    doc.setFillColor(...cor);
    doc.roundedRect(x, y, Math.max((w * p) / 100, 2.2), 4, 2, 2, "F");
  }
}

/** Anel (donut) desenhado por setores preenchidos (bordas suaves). */
function donut(doc: jsPDF, cx: number, cy: number, r: number, pct: number, cor: RGB) {
  const esp = 5.2;
  const rExt = r + esp / 2;
  const rInt = r - esp / 2;
  const p = Math.max(0, Math.min(100, pct));
  setor(doc, cx, cy, rExt, 0, 360, CINZA_CLARO);
  if (p > 0) setor(doc, cx, cy, rExt, 0, (p / 100) * 360, cor);
  doc.setFillColor(...BRANCO);
  doc.circle(cx, cy, rInt, "F");
}

/** Setor circular preenchido (triângulos a partir do centro). */
function setor(doc: jsPDF, cx: number, cy: number, r: number, deg0: number, deg1: number, cor: RGB) {
  doc.setFillColor(...cor);
  doc.setDrawColor(...cor);
  doc.setLineWidth(0.05);
  const passos = Math.max(2, Math.ceil(Math.abs(deg1 - deg0)));
  const pt = (i: number): [number, number] => {
    const a = ((deg0 + ((deg1 - deg0) * i) / passos - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  for (let i = 0; i < passos; i++) {
    const a = pt(i);
    const b = pt(i + 1);
    doc.triangle(cx, cy, a[0], a[1], b[0], b[1], "FD");
  }
  doc.setLineWidth(0.2);
}


function arco(doc: jsPDF, cx: number, cy: number, r: number, deg0: number, deg1: number) {
  const passos = Math.max(2, Math.ceil(Math.abs(deg1 - deg0) / 4));
  let prev: [number, number] | null = null;
  for (let i = 0; i <= passos; i++) {
    const a = ((deg0 + ((deg1 - deg0) * i) / passos - 90) * Math.PI) / 180;
    const pt: [number, number] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
    prev = pt;
  }
}

function barras(doc: jsPDF, x: number, y: number, w: number, h: number, valores: number[], labels: string[]) {
  const max = Math.max(...valores, 1);
  const gap = 1.6;
  const bw = (w - gap * (valores.length - 1)) / valores.length;
  doc.setDrawColor(...CINZA_LINHA);
  doc.setLineWidth(0.2);
  doc.line(x, y + h, x + w, y + h);
  valores.forEach((v, i) => {
    const bx = x + i * (bw + gap);
    const bh = v > 0 ? Math.max((v / max) * h, 1.2) : 0.7;
    doc.setFillColor(...(v > 0 ? MARSALA : CINZA_CLARO));
    doc.roundedRect(bx, y + h - bh, bw, bh, 0.6, 0.6, "F");
    doc.setFontSize(5.6);
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "normal");
    doc.text(labels[i] ?? "", bx + bw / 2, y + h + 3.2, { align: "center" });
  });
}

/* ===== Cabeçalho / rodapé ===== */

function marca(doc: jsPDF, y: number, claro: boolean) {
  const tx = claro ? BRANCO : MARSALA;
  doc.setTextColor(...tx);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("GR", ML, y + 9);
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("SERVIÇOS EXTRAJUDICIAIS", ML + 10, y + 9);
  doc.text("& REGISTRO DE MARCAS", ML, y + 14.6);
}

/** Capa/cabeçalho da primeira página: faixa marsala com dados do documento. */
function heroHeader(doc: jsPDF, titulo: string, sub: string) {
  doc.setFillColor(...MARSALA);
  doc.rect(0, 0, PW, 46, "F");
  doc.setFillColor(...MARSALA_ESC);
  doc.rect(0, 46, PW, 2.4, "F");
  // grafismo discreto
  doc.setDrawColor(...MARSALA_CLARO);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 6; i++) arco(doc, 196, 6, 16 + i * 6, 0, 360);

  marca(doc, 5, true);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...BRANCO);
  doc.text("RELATÓRIO EXECUTIVO DE MONITORAMENTO MEI", ML, 33);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(titulo, ML, 41.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(sub, MR, 41.5, { align: "right" });
}

/** Cabeçalho compacto das páginas internas. */
function pageHeader(doc: jsPDF, titulo: string, sub: string) {
  doc.setFillColor(...OFFWHITE);
  doc.rect(0, 0, PW, 26, "F");
  doc.setFillColor(...MARSALA);
  doc.rect(0, 26, PW, 1.2, "F");
  try {
    // PNG com transparência, sem fundo/caixa branca.
    doc.addImage(LOGO_GR_PNG, "PNG", ML, 4.5, 30, 18.9);
  } catch {
    /* logo opcional */
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAFITE);
  doc.text(titulo, ML + 35, 15.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(sub, MR, 15.5, { align: "right" });
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const emissao = new Date().toLocaleString("pt-BR");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CINZA_LINHA);
    doc.setLineWidth(0.3);
    doc.line(ML, 281, MR, 281);
    doc.setFillColor(...MARSALA);
    doc.rect(ML, 280.7, 22, 0.7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...MARSALA);
    doc.text(EMPRESA, ML, 285.6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE);
    doc.setFontSize(6.8);
    doc.text(CONTATO, ML, 289.4);
    doc.text(`Emitido em ${emissao}`, MR, 285.6, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAFITE);
    doc.text(`Página ${i} de ${pages}`, MR, 289.4, { align: "right" });
  }
}

function secao(doc: jsPDF, y: number, titulo: string, ctx?: { titulo: string; sub: string }) {
  // Evita título órfão no rodapé da página.
  if (y > 236) {
    doc.addPage();
    if (ctx) pageHeader(doc, ctx.titulo, ctx.sub);
    y = 36;
  }
  doc.setFillColor(...MARSALA);
  doc.roundedRect(ML, y - 3.4, 2.2, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GRAFITE);
  doc.text(titulo.toUpperCase(), ML + 5.4, y);
  doc.setDrawColor(...CINZA_LINHA);
  doc.setLineWidth(0.25);
  doc.line(ML + 5.4 + doc.getTextWidth(titulo.toUpperCase()) + 3, y - 1.2, MR, y - 1.2);
  return y + 5;
}


const TABLE_BASE = {
  theme: "grid" as const,
  headStyles: {
    fillColor: MARSALA,
    textColor: 255,
    fontStyle: "bold" as const,
    fontSize: 8,
    cellPadding: 2.6,
    lineColor: MARSALA,
    lineWidth: 0.1,
  },
  alternateRowStyles: { fillColor: OFFWHITE },
  styles: {
    fontSize: 8.2,
    cellPadding: 2.6,
    textColor: GRAFITE,
    lineColor: CINZA_LINHA,
    lineWidth: 0.1,
    valign: "middle" as const,
  },
  margin: { left: ML, right: 14, top: 34, bottom: 24 },
};

/* ===== Página de leitura para o cliente (linguagem simples) ===== */

/** Renderiza os blocos narrativos em cards, com quebra de página automática. */
function paginaNarrativa(doc: jsPDF, narr: Narrativa, ctx: { titulo: string; sub: string }) {
  doc.addPage();
  pageHeader(doc, ctx.titulo, ctx.sub);

  let y = 36;
  const larguraTexto = MR - ML - 16;

  const garantirEspaco = (altura: number) => {
    if (y + altura > 272) {
      doc.addPage();
      pageHeader(doc, ctx.titulo, ctx.sub);
      y = 36;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(...SLATE);
  doc.text(
    doc.splitTextToSize(
      "Este resumo foi escrito em linguagem simples para que você entenda, sem termos técnicos, como está a situação do seu MEI e o que precisa da sua atenção.",
      MR - ML,
    ),
    ML,
    y,
    { lineHeightFactor: 1.4 },
  );
  y += 14;

  narr.blocos.forEach((bloco) => {
    const linhas: string[][] = bloco.paragrafos
      .filter((p) => p && p.trim())
      .map((p) => doc.splitTextToSize(p, larguraTexto) as string[]);
    const alturaTexto = linhas.reduce((acc, l) => acc + l.length * 4.6 + 2.6, 0);
    const altura = alturaTexto + 16;
    garantirEspaco(altura + 6);

    card(doc, ML, y, MR - ML, altura, BRANCO);
    doc.setFillColor(...MARSALA);
    doc.roundedRect(ML, y, 2.4, altura, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.4);
    doc.setTextColor(...MARSALA);
    doc.text(bloco.titulo.toUpperCase(), ML + 8, y + 8);

    let ty = y + 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(...GRAFITE);
    linhas.forEach((l) => {
      doc.text(l, ML + 8, ty, { lineHeightFactor: 1.45 });
      ty += l.length * 4.6 + 2.6;
    });

    y += altura + 6;
  });

  // Glossário
  const alturaGloss = 14 + narr.glossario.length * 9;
  garantirEspaco(alturaGloss);
  card(doc, ML, y, MR - ML, alturaGloss, OFFWHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.setTextColor(...MARSALA);
  doc.text("O QUE SIGNIFICAM ESSES TERMOS", ML + 6, y + 8);
  let gy = y + 15;
  narr.glossario.forEach(([termo, def]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...GRAFITE);
    doc.text(termo, ML + 6, gy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE);
    const l = doc.splitTextToSize(def, MR - ML - 58) as string[];
    doc.text(l, ML + 52, gy, { lineHeightFactor: 1.4 });
    gy += Math.max(9, l.length * 4.4 + 2);
  });
}

/* ===== Relatório individual ===== */

export function gerarPDFCliente(db: DB, clienteId: string, comp: string) {
  const cliente = db.clientes.find((c) => c.id === clienteId);
  if (!cliente) return;
  const mon = db.monitoramentos.find((m) => m.cliente_id === clienteId && m.competencia === comp);
  const doc = new jsPDF();

  const { done, total } = checklistCount(mon);
  const pctChecklist = total > 0 ? (done / total) * 100 : 0;

  const anoPdf = Number(comp.slice(0, 4)) || new Date().getFullYear();
  const limite = limiteAnual(db);
  const mesesFat = getFaturamento(db, clienteId, anoPdf)?.meses ?? zerosAno();
  const linhas = calcularLinhas(mesesFat, limite);
  const resumo = resumoAno(mesesFat, limite);
  const metaSit = SITUACAO_META[resumo.situacao];
  const toneSit = SITUACAO_TONE[resumo.situacao] ?? "neutral";

  const guiasCliente = db.guias.filter((g) => g.cliente_id === clienteId);
  const guiasPendentes = guiasCliente.filter((g) => g.status === "pendente").length;
  const guiasAtrasadas = guiasCliente.filter((g) => g.status === "atrasada").length;

  const statusGeral = mon?.status_geral ?? "vermelho";
  const statusRel = mon?.status_relatorio ?? "nao_entregue";
  const statusParc = mon?.status_parcelamento ?? "sem_parcelamento";

  /* ---------- PÁGINA 1 — Painel executivo ---------- */
  heroHeader(doc, cliente.nome, `Competência ${formatCompetencia(comp)}`);

  // Faixa de identificação
  let y = 56;
  card(doc, ML, y, MR - ML, 22, OFFWHITE);
  const logoW = 30;
  try {
    // PNG com transparência, sem fundo/caixa branca.
    doc.addImage(LOGO_GR_PNG, "PNG", MR - logoW - 5, y + 2, logoW, 18.9);
  } catch {
    /* logo opcional */
  }
  const idCols: [string, string][] = [
    ["CNPJ", cliente.cnpj || "—"],
    ["CPF", cliente.cpf || "—"],
    ["CIDADE", cliente.cidade || "—"],
    ["CONTRATO", statusLabel(cliente.status_contrato)],
  ];
  const idW = (MR - ML - 12 - logoW - 5) / 4;
  idCols.forEach(([k, v], i) => {
    const x = ML + 6 + i * idW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...SLATE);
    doc.text(k, x, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(...GRAFITE);
    doc.text(doc.splitTextToSize(String(v), idW - 3)[0] ?? "", x, y + 15);
  });

  // KPIs
  y = 82;
  const kpiW = (MR - ML - 3 * 4) / 4;
  const kpis: { titulo: string; valor: string; tone: "green" | "yellow" | "red" | "neutral"; sub: string }[] = [
    {
      titulo: "STATUS GERAL",
      valor: statusLabel(statusGeral),
      tone: TONE_STATUS[statusGeral] ?? "neutral",
      sub: "Situação da competência",
    },
    {
      titulo: "CHECKLIST",
      valor: `${done}/${total}`,
      tone: done === total ? "green" : done === 0 ? "red" : "yellow",
      sub: `${Math.round(pctChecklist)}% concluído`,
    },
    {
      titulo: "FATURAMENTO ANO",
      valor: formatBRL(resumo.total),
      tone: "neutral",
      sub: `Média ${formatBRL(resumo.media)}`,
    },
    {
      titulo: "GUIAS",
      valor: `${guiasCliente.length}`,
      tone: guiasAtrasadas > 0 ? "red" : guiasPendentes > 0 ? "yellow" : "green",
      sub: `${guiasPendentes} pend. • ${guiasAtrasadas} atras.`,
    },
  ];
  kpis.forEach((k, i) => {
    const x = ML + i * (kpiW + 4);
    card(doc, x, y, kpiW, 26);
    const { fg } = toneCores(k.tone);
    doc.setFillColor(...fg);
    doc.roundedRect(x, y + 3, 1.8, 20, 0.9, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(...SLATE);
    doc.text(k.titulo, x + 5.5, y + 7.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(k.valor.length > 12 ? 9 : 12);
    doc.setTextColor(...GRAFITE);
    doc.text(k.valor, x + 5.5, y + 15.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(...SLATE);
    doc.text(k.sub, x + 5.5, y + 21.4);
  });

  // Limite MEI: donut + barra de progresso
  y = 114;
  const colW = (MR - ML - 5) / 2;
  card(doc, ML, y, colW, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text("LIMITE ANUAL MEI UTILIZADO", ML + 6, y + 8);

  const { fg: corSit } = toneCores(toneSit);
  donut(doc, ML + 24, y + 33, 13, resumo.percentual, corSit);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...GRAFITE);
  doc.text(`${resumo.percentual.toFixed(1)}%`, ML + 24, y + 34, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...SLATE);
  doc.text("do limite", ML + 24, y + 38.5, { align: "center" });

  const infoX = ML + 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text("Acumulado no ano", infoX, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GRAFITE);
  doc.text(formatBRL(resumo.total), infoX, y + 26.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(`Limite: ${formatBRL(limite)}`, infoX, y + 32.5);
  progresso(doc, infoX, y + 36, colW - (infoX - ML) - 6, resumo.percentual, corSit);
  badge(doc, infoX, y + 43.5, `${metaSit.label}`, toneSit);

  // Gráfico de barras
  card(doc, ML + colW + 5, y, colW, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`FATURAMENTO MENSAL — ${anoPdf}`, ML + colW + 11, y + 8);
  barras(
    doc,
    ML + colW + 11,
    y + 14,
    colW - 12,
    32,
    linhas.map((l) => l.valor),
    ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.setTextColor(...SLATE);
  doc.text(
    `Maior mês: ${formatBRL(Math.max(...linhas.map((l) => l.valor)))}  •  Média: ${formatBRL(resumo.media)}`,
    ML + colW + 11,
    y + 55,
  );

  // Status detalhado (badges)
  y = 180;
  card(doc, ML, y, MR - ML, 20, OFFWHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(...SLATE);
  doc.text("RELATÓRIO", ML + 6, y + 7);
  doc.text("PARCELAMENTO", ML + 66, y + 7);
  doc.text("PROGRESSO DO CHECKLIST", ML + 126, y + 7);
  badge(doc, ML + 6, y + 9.5, statusLabel(statusRel), TONE_STATUS[statusRel] ?? "neutral");
  badge(doc, ML + 66, y + 9.5, statusLabel(statusParc), TONE_STATUS[statusParc] ?? "neutral");
  progresso(doc, ML + 126, y + 11, 44, pctChecklist, done === total ? VERDE : done === 0 ? VERMELHO : AMBAR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...GRAFITE);
  doc.text(`${done}/${total}`, ML + 174, y + 14);

  // Resumo executivo (altura dinâmica conforme o texto)
  const { concluidos, pendentes } = separarChecklist(mon?.checklist);
  const parcelamentosCliente = db.parcelamentos.filter((p) => p.cliente_id === clienteId);
  const parcelasPendentes = parcelamentosCliente.reduce(
    (acc, p) => acc + p.parcelas.filter((pa) => !pa.pago).length,
    0,
  );
  const proxima = guiasCliente
    .filter((g) => g.status !== "paga")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  const narrativa: Narrativa = gerarNarrativa({
    nome: cliente.nome,
    comp,
    statusGeral,
    statusRelatorio: statusRel,
    statusParcelamento: statusParc,
    done,
    total,
    itensConcluidos: concluidos,
    itensPendentes: pendentes,
    totalFat: resumo.total,
    percentual: resumo.percentual,
    limite,
    disponivel: Math.max(limite - resumo.total, 0),
    situacaoLabel: metaSit.label,
    ano: anoPdf,
    guiasPendentes,
    guiasAtrasadas,
    guiasPagas: guiasCliente.filter((g) => g.status === "paga").length,
    proximoVencimento: proxima
      ? { descricao: proxima.descricao || `Guia ${proxima.tipo}`, vencimento: proxima.vencimento, valor: proxima.valor }
      : undefined,
    parcelamentosAbertos: parcelamentosCliente.filter((p) => p.parcelas.some((pa) => !pa.pago)).length,
    parcelasPendentes,
    pendencias: mon?.pendencias ?? "",
    alertas: mon?.alertas ?? "",
  });

  y = 206;
  const texto = narrativa.resumo;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  const linhasResumo: string[] = doc.splitTextToSize(texto, MR - ML - 14);
  const alturaResumo = Math.max(30, 20 + linhasResumo.length * 4.5);
  card(doc, ML, y, MR - ML, alturaResumo, BRANCO);
  doc.setFillColor(...MARSALA);
  doc.roundedRect(ML, y, 2.4, alturaResumo, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MARSALA);
  doc.text("RESUMO EXECUTIVO", ML + 7, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...GRAFITE);
  doc.text(linhasResumo, ML + 7, y + 16.5, { lineHeightFactor: 1.45 });

  /* ---------- Páginas em linguagem simples para o cliente ---------- */
  paginaNarrativa(doc, narrativa, {
    titulo: cliente.nome,
    sub: `Relatório explicado • ${formatCompetencia(comp)}`,
  });

  const CTX = { titulo: cliente.nome, sub: `Detalhamento técnico • ${formatCompetencia(comp)}` };
  /* ---------- Detalhamento técnico ---------- */
  doc.addPage();
  const paginaTecnicaInicio = doc.getNumberOfPages();
  pageHeader(doc, CTX.titulo, CTX.sub);

  let cursor = secao(doc, 36, "Dados cadastrais do cliente");
  autoTable(doc, {
    ...TABLE_BASE,
    startY: cursor,
    head: [["Campo", "Informação", "Campo", "Informação"]],
    body: [
      ["CNPJ", cliente.cnpj || "—", "Telefone", cliente.telefone || "—"],
      ["CPF", cliente.cpf || "—", "E-mail", cliente.email || "—"],
      ["Atividade", cliente.atividade || "—", "Valor mensal", formatBRL(cliente.valor_mensal)],
      ["CNAE", cliente.cnae || "—", "Vencimento", cliente.vencimento_dia ? `Dia ${cliente.vencimento_dia}` : "—"],
      ["Cidade", cliente.cidade || "—", "Status do contrato", statusLabel(cliente.status_contrato)],
    ],
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold", fillColor: OFFWHITE },
      2: { cellWidth: 32, fontStyle: "bold", fillColor: OFFWHITE },
    },
    alternateRowStyles: { fillColor: BRANCO },
  });

  cursor = secao(doc, (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12, "Situação da competência", CTX);
  autoTable(doc, {
    ...TABLE_BASE,
    startY: cursor,
    head: [["Indicador", "Situação"]],
    body: [
      ["Status geral", statusLabel(statusGeral)],
      ["Relatório", statusLabel(statusRel)],
      ["Parcelamento", statusLabel(statusParc)],
      ["Checklist", `${done} de ${total} concluídos`],
      ["Pendências", mon?.pendencias || "—"],
      ["Alertas", mon?.alertas || "—"],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: OFFWHITE } },
    alternateRowStyles: { fillColor: BRANCO },
  });

  cursor = secao(doc, (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12, "Checklist de monitoramento", CTX);
  autoTable(doc, {
    ...TABLE_BASE,
    startY: cursor,
    styles: { ...TABLE_BASE.styles, fontSize: 7.6, cellPadding: 2.2 },
    head: [["Item", "Situação", "Dados registrados"]],
    body: CHECKLIST_ITEMS.map((item) => {
      const dados = mon?.dados_checklist?.[item.key] ?? {};
      const detalhes = item.campos
        .map((campo) => {
          const v = dados[campo.key];
          return v ? `${campo.label}: ${v}` : null;
        })
        .filter(Boolean)
        .join("\n");
      return [item.label, mon?.checklist?.[item.key] ? "Concluído" : "Pendente", detalhes || "—"];
    }),
    columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 24, halign: "center" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const ok = data.cell.raw === "Concluído";
        data.cell.styles.textColor = ok ? VERDE : AMBAR;
        data.cell.styles.fillColor = ok ? VERDE_SOFT : AMBAR_SOFT;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  /* ---------- Controle de Faturamento ---------- */
  cursor = secao(
    doc,
    (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
    `Controle de faturamento — ${anoPdf}`,
    CTX,
  );
  autoTable(doc, {
    ...TABLE_BASE,
    startY: cursor,
    styles: { ...TABLE_BASE.styles, fontSize: 7.8, cellPadding: 2.4 },
    head: [["Mês", "Faturamento do mês", "Acumulado no ano", "Limite anual MEI", "% do limite", "Média mensal", "Situação"]],
    body: linhas.map((l) => [
      l.nome,
      formatBRL(l.valor),
      formatBRL(l.acumulado),
      formatBRL(l.limite),
      // Regra: percentual só é exibido quando há faturamento informado no mês.
      l.valor > 0 ? `${l.percentual.toFixed(1)}%` : "",
      formatBRL(l.media),
      SITUACAO_META[l.situacao].label,
    ]),
    foot: [
      [
        "TOTAL",
        formatBRL(resumo.total),
        formatBRL(resumo.total),
        formatBRL(limite),
        resumo.total > 0 ? `${resumo.percentual.toFixed(1)}%` : "",
        formatBRL(resumo.media),
        metaSit.label,
      ],
    ],
    footStyles: {
      fillColor: MARSALA_ESC,
      textColor: 255,
      fontStyle: "bold" as const,
      fontSize: 8,
      lineColor: MARSALA_ESC,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: "bold" },
      1: { halign: "right" as const },
      2: { halign: "right" as const },
      3: { halign: "right" as const, textColor: SLATE },
      4: { halign: "right" as const, fontStyle: "bold" as const },
      5: { halign: "right" as const },
      6: { cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const linha = linhas[data.row.index];
        if (linha) {
          const { fg, bg } = toneCores(SITUACAO_TONE[linha.situacao] ?? "neutral");
          data.cell.styles.textColor = fg;
          data.cell.styles.fillColor = bg;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  /* ---------- Guias ---------- */
  (["DAS", "DARF"] as const).forEach((tipo) => {
    const guias = db.guias.filter((g) => g.cliente_id === clienteId && g.tipo === tipo);
    if (!guias.length) return;
    cursor = secao(
      doc,
      (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
      `Guias ${tipo}`,
      CTX,
    );
    autoTable(doc, {
      ...TABLE_BASE,
      startY: cursor,
      styles: { ...TABLE_BASE.styles, fontSize: 7.8 },
      head: [["#", "Descrição", "Competência", "Valor", "Vencimento", "Status", "Pago em"]],
      body: guias.map((g, i) => [
        `${i + 1}`,
        g.descricao || "—",
        formatCompetencia(g.competencia),
        formatBRL(g.valor),
        formatDateBR(g.vencimento),
        statusLabel(g.status),
        formatDateBR(g.data_pago),
      ]),
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 3: { halign: "right" as const } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const g = guias[data.row.index];
          if (g) {
            const { fg, bg } = toneCores(TONE_STATUS[g.status] ?? "neutral");
            data.cell.styles.textColor = fg;
            data.cell.styles.fillColor = bg;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  });

  /* ---------- Parcelamentos ---------- */
  db.parcelamentos
    .filter((p) => p.cliente_id === clienteId)
    .forEach((p) => {
      cursor = secao(
        doc,
        (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
        `Parcelamento ${p.tipo ?? "DAS"} • ${p.descricao} — ${formatBRL(p.valor_total)}`,
        CTX,
      );
      autoTable(doc, {
        ...TABLE_BASE,
        startY: cursor,
        styles: { ...TABLE_BASE.styles, fontSize: 7.8 },
        head: [["Parcela", "Valor", "Vencimento", "Status", "Pago em"]],
        body: p.parcelas.map((pa) => [
          `${pa.n}/${p.parcelas.length}`,
          formatBRL(pa.valor),
          formatDateBR(pa.vencimento),
          pa.pago ? "Pago" : "Pendente",
          formatDateBR(pa.data_pago),
        ]),
        columnStyles: { 1: { halign: "right" as const } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const ok = data.cell.raw === "Pago";
            const { fg, bg } = toneCores(ok ? "green" : "yellow");
            data.cell.styles.textColor = fg;
            data.cell.styles.fillColor = bg;
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
    });

  for (let i = paginaTecnicaInicio; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    pageHeader(doc, CTX.titulo, CTX.sub);
  }
  footer(doc);
  doc.save(`relatorio-${cliente.nome.replace(/\s+/g, "-").toLowerCase()}-${comp}.pdf`);
}

/* ===== Relatório geral da competência ===== */

export function gerarPDFCompetencia(db: DB, comp: string) {
  const doc = new jsPDF();
  heroHeader(doc, "Relatório Geral de Monitoramento", `Competência ${formatCompetencia(comp)}`);

  const ativos = db.clientes.filter((c) => c.status_contrato === "ativo");
  const mons = ativos.map((c) => db.monitoramentos.find((m) => m.cliente_id === c.id && m.competencia === comp));
  const regulares = mons.filter((m) => (m?.status_geral ?? "vermelho") === "verde").length;
  const emReg = mons.filter((m) => (m?.status_geral ?? "vermelho") === "amarelo").length;
  const irregulares = ativos.length - regulares - emReg;

  let y = 56;
  const kpiW = (MR - ML - 3 * 4) / 4;
  const kpis: { t: string; v: string; tone: "green" | "yellow" | "red" | "neutral" }[] = [
    { t: "CLIENTES ATIVOS", v: String(ativos.length), tone: "neutral" },
    { t: "REGULARES", v: String(regulares), tone: "green" },
    { t: "EM REGULARIZAÇÃO", v: String(emReg), tone: "yellow" },
    { t: "IRREGULARES", v: String(irregulares), tone: "red" },
  ];
  kpis.forEach((k, i) => {
    const x = ML + i * (kpiW + 4);
    card(doc, x, y, kpiW, 24);
    const { fg } = toneCores(k.tone);
    doc.setFillColor(...fg);
    doc.roundedRect(x, y + 3, 1.8, 18, 0.9, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(...SLATE);
    doc.text(k.t, x + 5.5, y + 8);
    doc.setFontSize(15);
    doc.setTextColor(...GRAFITE);
    doc.text(k.v, x + 5.5, y + 18);
  });

  y = secao(doc, 92, "Panorama por cliente");

  const body = ativos.map((cliente) => {
    const mon = db.monitoramentos.find((m) => m.cliente_id === cliente.id && m.competencia === comp);
    const { done, total } = checklistCount(mon);
    return [
      cliente.nome,
      cliente.cnpj || "—",
      statusLabel(mon?.status_geral ?? "vermelho"),
      statusLabel(mon?.status_relatorio ?? "nao_entregue"),
      `${done}/${total}`,
      mon?.pendencias || "—",
    ];
  });

  autoTable(doc, {
    ...TABLE_BASE,
    startY: y,
    styles: { ...TABLE_BASE.styles, fontSize: 7.8, cellPadding: 2.4 },
    head: [["Cliente", "CNPJ", "Status geral", "Relatório", "Checklist", "Pendências"]],
    body,
    columnStyles: { 2: { cellWidth: 26 }, 3: { cellWidth: 24 }, 4: { cellWidth: 18, halign: "center" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const mon = mons[data.row.index];
        const { fg, bg } = toneCores(TONE_STATUS[mon?.status_geral ?? "vermelho"] ?? "neutral");
        data.cell.styles.textColor = fg;
        data.cell.styles.fillColor = bg;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  footer(doc);
  doc.save(`relatorio-geral-${comp}.pdf`);
}
