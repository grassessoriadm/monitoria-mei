export type StatusGeral = "vermelho" | "amarelo" | "verde";
export type StatusRelatorio = "nao_entregue" | "entregue" | "aprovado";
export type StatusParcelamento = "sem_parcelamento" | "em_parcelamento" | "quitado";
export type StatusContrato = "ativo" | "suspenso" | "encerrado";
export type GuiaTipo = "DAS" | "DARF";
export type GuiaStatus = "paga" | "pendente" | "atrasada";

export interface Competencia {
  id: string;
  competencia: string;
  referencia: string;
  atual: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  cpf: string;
  atividade: string;
  cnae: string;
  cidade: string;
  telefone: string;
  email: string;
  valor_mensal: number | null;
  vencimento_dia: number | null;
  status_contrato: StatusContrato;
  tem_parcelamento: boolean;
  tem_guias: boolean;
  possui_faturamento: boolean;
  observacoes: string;
}

export interface Monitoramento {
  id: string;
  cliente_id: string;
  competencia: string;
  status_geral: StatusGeral;
  status_relatorio: StatusRelatorio;
  status_parcelamento: StatusParcelamento;
  checklist: Record<string, boolean>;
  dados_checklist: Record<string, Record<string, string>>;
  pendencias: string;
  alertas: string;
  updated_at: string;
}

export interface Parcela {
  n: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  data_pago: string | null;
}

export interface Parcelamento {
  id: string;
  cliente_id: string;
  tipo?: GuiaTipo;
  descricao: string;
  competencia_origem: string;
  total_parcelas: number;
  valor_total: number;
  parcelas: Parcela[];
}

export interface Guia {
  id: string;
  cliente_id: string;
  tipo: GuiaTipo;
  competencia: string;
  descricao?: string;
  valor: number;
  vencimento: string;
  status: GuiaStatus;
  data_pago: string | null;
}

export type SituacaoFaturamento = "dentro" | "atencao" | "proximo" | "excedido";

export interface Faturamento {
  id: string;
  cliente_id: string;
  ano: number;
  /** 12 posições, Janeiro..Dezembro */
  meses: number[];
}

export interface Configuracao {
  limite_anual_mei: number;
}

export interface DB {
  competencias: Competencia[];
  clientes: Cliente[];
  monitoramentos: Monitoramento[];
  parcelamentos: Parcelamento[];
  guias: Guia[];
  faturamentos: Faturamento[];
  config: Configuracao;
}


export interface Session {
  email: string;
  nome: string;
}

export interface Usuario {
  email: string;
  senha: string;
  nome: string;
}