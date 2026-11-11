/**
 * Camada de redação do relatório.
 *
 * Transforma os dados JÁ EXISTENTES do sistema em textos simples e acolhedores,
 * para que o cliente final entenda a situação do seu MEI sem conhecer termos
 * contábeis. NÃO cria informação nova: apenas organiza, resume e explica.
 * Nenhum cálculo é feito aqui — todos os números chegam prontos.
 */
import { CHECKLIST_ITEMS, statusLabel } from "./constants";
import { formatBRL, formatCompetencia, formatDateBR } from "./format";

export interface DadosNarrativa {
  nome: string;
  comp: string;
  statusGeral: string;
  statusRelatorio: string;
  statusParcelamento: string;
  done: number;
  total: number;
  itensConcluidos: string[];
  itensPendentes: string[];
  totalFat: number;
  percentual: number;
  limite: number;
  disponivel: number;
  situacaoLabel: string;
  ano: number;
  guiasPendentes: number;
  guiasAtrasadas: number;
  guiasPagas: number;
  proximoVencimento?: { descricao: string; vencimento: string; valor: number } | undefined;
  parcelamentosAbertos: number;
  parcelasPendentes: number;
  pendencias: string;
  alertas: string;
}

export interface BlocoNarrativa {
  titulo: string;
  paragrafos: string[];
}

export interface Narrativa {
  resumo: string;
  blocos: BlocoNarrativa[];
  glossario: [string, string][];
}

const juntar = (itens: string[]) =>
  itens.length <= 1
    ? (itens[0] ?? "")
    : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

function fraseSituacao(d: DadosNarrativa) {
  if (d.statusGeral === "verde")
    return `No período analisado, o MEI de ${d.nome} está em situação regular. Isso quer dizer que as obrigações acompanhadas por nós estão em dia.`;
  if (d.statusGeral === "amarelo")
    return `No período analisado, o MEI de ${d.nome} está em processo de regularização. Existem pontos sendo tratados por nossa equipe, mas nada que impeça o funcionamento da empresa.`;
  return `No período analisado, o MEI de ${d.nome} apresenta pontos irregulares. Isso significa que há obrigações em aberto que precisam de atenção para evitar cobranças maiores no futuro.`;
}

function fraseFaturamento(d: DadosNarrativa) {
  const base = `Até aqui, o faturamento registrado em ${d.ano} soma ${formatBRL(
    d.totalFat,
  )}, o que representa cerca de ${pct(d.percentual)} do valor máximo que um MEI pode faturar no ano (${formatBRL(
    d.limite,
  )}).`;
  if (d.totalFat <= 0)
    return `Ainda não há faturamento informado para ${d.ano}. Assim que os valores forem enviados, o acompanhamento do limite anual passa a ser feito mês a mês.`;
  if (d.percentual > 100)
    return `${base} O limite do ano já foi ultrapassado, e isso exige providências: pode haver cobrança de impostos complementares e, dependendo do valor, mudança de categoria da empresa. Vamos orientar você sobre o próximo passo.`;
  if (d.percentual >= 80)
    return `${base} Como o valor já está próximo do limite, é importante controlar as próximas vendas. Ainda restam ${formatBRL(
      d.disponivel,
    )} até o teto do ano.`;
  if (d.percentual >= 50)
    return `${base} O uso do limite pede atenção, mas está sob controle: ainda restam ${formatBRL(
      d.disponivel,
    )} disponíveis até o fim do ano.`;
  return `${base} O faturamento está confortavelmente dentro do limite, com ${formatBRL(
    d.disponivel,
  )} ainda disponíveis no ano.`;
}

function fraseGuias(d: DadosNarrativa) {
  if (d.guiasAtrasadas > 0)
    return `Identificamos ${d.guiasAtrasadas} guia(s) de imposto em atraso. Quanto antes o pagamento for feito, menores serão os juros e a multa acumulados.`;
  if (d.guiasPendentes > 0)
    return `Existem ${d.guiasPendentes} guia(s) de imposto aguardando pagamento dentro do prazo. Basta pagar até a data de vencimento para manter tudo em ordem.`;
  if (d.guiasPagas > 0) return "Todas as guias de imposto emitidas até o momento estão pagas.";
  return "Não há guias de imposto pendentes ou em atraso registradas neste período.";
}

export function gerarNarrativa(d: DadosNarrativa): Narrativa {
  const resumo = [fraseSituacao(d), fraseFaturamento(d), fraseGuias(d)].join(" ");

  const blocos: BlocoNarrativa[] = [];

  blocos.push({
    titulo: "Situação atual do seu MEI",
    paragrafos: [
      fraseSituacao(d),
      fraseFaturamento(d),
      `Referência deste relatório: ${formatCompetencia(d.comp)}. O relatório mensal está com a situação "${statusLabel(
        d.statusRelatorio,
      )}".`,
    ],
  });

  const analisados = d.itensConcluidos.length
    ? `Durante esta monitoria, verificamos os seguintes pontos: ${juntar(d.itensConcluidos)}.`
    : "Nesta competência, a verificação dos itens de acompanhamento ainda não foi concluída.";
  blocos.push({
    titulo: "O que foi analisado e realizado",
    paragrafos: [
      `Nosso acompanhamento é feito por uma lista de ${d.total} verificações mensais. Neste período, ${d.done} de ${d.total} foram concluídas.`,
      analisados,
      d.itensPendentes.length
        ? `Ainda estão em andamento: ${juntar(d.itensPendentes)}.`
        : "Nenhum item ficou em aberto nesta competência.",
    ],
  });

  const identificado: string[] = [fraseGuias(d)];
  if (d.parcelamentosAbertos > 0)
    identificado.push(
      `Há ${d.parcelamentosAbertos} parcelamento(s) em andamento, com ${d.parcelasPendentes} parcela(s) ainda a vencer. Parcelamento é o acordo que divide um valor devido em pagamentos mensais.`,
    );
  else if (d.statusParcelamento === "quitado")
    identificado.push("O parcelamento acompanhado já foi totalmente quitado.");
  else identificado.push("Não há valores parcelados em aberto neste momento.");
  if (d.pendencias.trim()) identificado.push(`Pendências anotadas pela equipe: ${d.pendencias.trim()}`);
  if (d.alertas.trim()) identificado.push(`Pontos de atenção: ${d.alertas.trim()}`);
  blocos.push({ titulo: "O que foi identificado", paragrafos: identificado });

  const acoes: string[] = [];
  if (d.guiasAtrasadas > 0) acoes.push("Regularizar o pagamento das guias em atraso o quanto antes.");
  if (d.proximoVencimento)
    acoes.push(
      `Pagar ${d.proximoVencimento.descricao || "a próxima guia"} no valor de ${formatBRL(
        d.proximoVencimento.valor,
      )} até ${formatDateBR(d.proximoVencimento.vencimento)}.`,
    );
  if (d.parcelasPendentes > 0) acoes.push("Manter em dia as parcelas do acordo já firmado.");
  if (d.percentual >= 80)
    acoes.push("Acompanhar de perto as vendas do restante do ano por causa da proximidade do limite do MEI.");
  acoes.push("Continuar enviando as notas e os valores faturados de cada mês para manter o controle atualizado.");
  if (!d.guiasAtrasadas && !d.guiasPendentes && d.percentual < 80 && d.statusGeral === "verde")
    acoes.unshift("Nenhuma ação urgente é necessária neste momento. Está tudo em ordem.");
  blocos.push({ titulo: "O que você precisa fazer agora", paragrafos: acoes.map((a) => `•  ${a}`) });

  const glossario: [string, string][] = [
    ["DAS", "É a guia mensal do MEI. Nela estão reunidos os impostos e a contribuição para o INSS."],
    ["DARF", "Guia usada para pagar impostos específicos, fora da guia mensal do MEI."],
    [
      "Limite anual do MEI",
      `É o valor máximo que o MEI pode faturar por ano (${formatBRL(d.limite)}). Ultrapassar esse valor gera cobranças extras.`,
    ],
    ["Faturamento acumulado", "É a soma de tudo o que a empresa vendeu ou prestou de serviço no ano até agora."],
    ["Parcelamento", "Acordo que permite dividir um valor devido em parcelas mensais."],
    ["Competência", "É o mês a que se referem as informações deste relatório."],
  ];

  return { resumo, blocos, glossario };
}

/** Labels do checklist separados entre concluídos e pendentes. */
export function separarChecklist(checklist: Record<string, boolean> | undefined) {
  const concluidos: string[] = [];
  const pendentes: string[] = [];
  CHECKLIST_ITEMS.forEach((item) => {
    (checklist?.[item.key] ? concluidos : pendentes).push(item.label);
  });
  return { concluidos, pendentes };
}
