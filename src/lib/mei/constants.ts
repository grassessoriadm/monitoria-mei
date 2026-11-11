import type { StatusGeral, StatusRelatorio, StatusParcelamento } from "./types";

export const STATUS_GERAL_OPS: StatusGeral[] = ["vermelho", "amarelo", "verde"];
export const STATUS_RELATORIO_OPS: StatusRelatorio[] = ["nao_entregue", "entregue", "aprovado"];
export const STATUS_PARCELAMENTO_OPS: StatusParcelamento[] = [
  "sem_parcelamento",
  "em_parcelamento",
  "quitado",
];

export const STATUS_LABELS: Record<string, string> = {
  vermelho: "Irregular",
  amarelo: "Em Regularização",
  verde: "Regular",
  nao_entregue: "Não entregue",
  entregue: "Entregue",
  aprovado: "Aprovado",
  sem_parcelamento: "Sem parcelamento",
  em_parcelamento: "Em parcelamento",
  quitado: "Quitado",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  paga: "Paga",
  pendente: "Pendente",
  atrasada: "Atrasada",
};

export type Tone = "red" | "yellow" | "green" | "neutral";

export const STATUS_TONE: Record<string, Tone> = {
  vermelho: "red",
  amarelo: "yellow",
  verde: "green",
  nao_entregue: "red",
  entregue: "yellow",
  aprovado: "green",
  sem_parcelamento: "neutral",
  em_parcelamento: "yellow",
  quitado: "green",
  ativo: "green",
  suspenso: "yellow",
  encerrado: "neutral",
  paga: "green",
  pendente: "yellow",
  atrasada: "red",
};

export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
export const statusTone = (s: string): Tone => STATUS_TONE[s] ?? "neutral";

export interface ChecklistCampo {
  key: string;
  label: string;
  type: "date" | "month" | "number" | "text";
}

export interface ChecklistItem {
  key: string;
  label: string;
  desc: string;
  campos: ChecklistCampo[];
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: "acolhimento",
    label: "Confirmar data de acolhimento",
    desc: "Verificar e registrar a data de acolhimento do cliente",
    campos: [{ key: "data_acolhimento", label: "Data de acolhimento", type: "date" }],
  },
  {
    key: "conciliacao",
    label: "Conciliação de pagamentos (Valores x Liquidado)",
    desc: "Conciliar valores cobrados vs. liquidados",
    campos: [
      { key: "valor_cobrado", label: "Valor cobrado (R$)", type: "number" },
      { key: "valor_liquidado", label: "Valor liquidado (R$)", type: "number" },
    ],
  },
  {
    key: "guia_parcelamento",
    label: "Emitir Guia de Parcelamento",
    desc: "Emitir guia de parcelamento quando aplicável",
    campos: [{ key: "data_emissao_parcelamento", label: "Data de emissão", type: "date" }],
  },
  {
    key: "guia_das",
    label: "Emitir Guia DAS (Mensal)",
    desc: "Emitir a guia DAS do mês",
    campos: [
      { key: "competencia_das", label: "Competência", type: "month" },
      { key: "valor_das", label: "Valor DAS (R$)", type: "number" },
    ],
  },
  {
    key: "vencimentos",
    label: "Conferir vencimentos das guias",
    desc: "Verificar vencimentos de guias DAS e DARF",
    campos: [
      { key: "venc_das", label: "Vencimento DAS", type: "date" },
      { key: "venc_darf", label: "Vencimento DARF", type: "date" },
    ],
  },
  {
    key: "faturamento_acum",
    label: "Validar faturamento acumulado",
    desc: "Validar o faturamento acumulado do período",
    campos: [
      { key: "faturamento_mes", label: "Faturamento do mês (R$)", type: "number" },
      { key: "faturamento_acumulado", label: "Faturamento acumulado (R$)", type: "number" },
    ],
  },
  {
    key: "relatorio_mensal",
    label: "Gerar Relatório de Monitoramento mensal",
    desc: "Gerar relatório mensal de monitoramento",
    campos: [{ key: "data_relatorio", label: "Data do relatório", type: "date" }],
  },
  {
    key: "envio_painel",
    label: "Enviar o Painel de Relatório (E-mail e WhatsApp)",
    desc: "Enviar painel de relatório ao cliente",
    campos: [
      { key: "data_envio_email", label: "Envio por e-mail", type: "date" },
      { key: "data_envio_wpp", label: "Envio por WhatsApp", type: "date" },
    ],
  },
  {
    key: "levantamento_fat",
    label: "Levantamento de Faturamento",
    desc: "Realizar levantamento de faturamento",
    campos: [{ key: "observacao_levantamento", label: "Observação", type: "text" }],
  },
];