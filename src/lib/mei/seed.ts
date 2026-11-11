import { competenciaAtual, formatCompetencia, nowISO, uid } from "./format";
import { LIMITE_MEI_PADRAO, garantirFaturamentos, sincronizarMonitoramentos } from "./faturamento";
import type { DB, Monitoramento, StatusGeral, StatusParcelamento, StatusRelatorio } from "./types";


function makeMon(
  cliente_id: string,
  competencia: string,
  status_geral: StatusGeral,
  status_relatorio: StatusRelatorio,
  status_parcelamento: StatusParcelamento,
  checklist: Record<string, boolean>,
  pendencias = "",
  alertas = "",
): Monitoramento {
  return {
    id: uid(),
    cliente_id,
    competencia,
    status_geral,
    status_relatorio,
    status_parcelamento,
    checklist: { ...checklist },
    dados_checklist: {},
    pendencias,
    alertas,
    updated_at: nowISO(),
  };
}

const ALL = {
  acolhimento: true,
  conciliacao: true,
  guia_parcelamento: false,
  guia_das: true,
  vencimentos: true,
  faturamento_acum: true,
  relatorio_mensal: true,
  envio_painel: true,
  levantamento_fat: true,
};
const NONE = {
  acolhimento: false,
  conciliacao: false,
  guia_parcelamento: false,
  guia_das: false,
  vencimentos: false,
  faturamento_acum: false,
  relatorio_mensal: false,
  envio_painel: false,
  levantamento_fat: false,
};

export function buildSeedData(): DB {
  const cur = competenciaAtual();
  const competencias = [
    { id: "c1", competencia: "2026-06", referencia: "Jun/2026", atual: false },
    { id: "c2", competencia: "2026-07", referencia: "Jul/2026", atual: false },
    { id: "c3", competencia: cur, referencia: formatCompetencia(cur), atual: true },
  ].filter((c, i, arr) => arr.findIndex((x) => x.competencia === c.competencia) === i);

  const clientes: DB["clientes"] = [
    {
      id: "cl1", nome: "Maria Silva MEI", cnpj: "12.345.678/0001-90", cpf: "123.456.789-00",
      atividade: "Cabeleireira", cnae: "9602-5/01", cidade: "São Paulo - SP", telefone: "(11) 98765-4321",
      email: "maria@email.com", valor_mensal: 150, vencimento_dia: 10, status_contrato: "ativo",
      tem_parcelamento: false, tem_guias: true, possui_faturamento: true,
      observacoes: "Cliente desde 2023. Sempre pontual.",
    },
    {
      id: "cl2", nome: "João Pereira MEI", cnpj: "98.765.432/0001-11", cpf: "987.654.321-00",
      atividade: "Eletricista", cnae: "4321-5/00", cidade: "Guarulhos - SP", telefone: "(11) 91234-5678",
      email: "joao@email.com", valor_mensal: 180, vencimento_dia: 5, status_contrato: "ativo",
      tem_parcelamento: true, tem_guias: true, possui_faturamento: true,
      observacoes: "Em parcelamento de imposto atrasado.",
    },
    {
      id: "cl3", nome: "Ana Santos MEI", cnpj: "55.444.333/0001-22", cpf: "456.789.123-44",
      atividade: "Confeitaria", cnae: "1091-1/01", cidade: "Osasco - SP", telefone: "(11) 99988-7766",
      email: "ana@email.com", valor_mensal: 200, vencimento_dia: 15, status_contrato: "ativo",
      tem_parcelamento: true, tem_guias: false, possui_faturamento: true,
      observacoes: "Declaração atrasada. Necessita acompanhamento.",
    },
    {
      id: "cl4", nome: "Carlos Oliveira MEI", cnpj: "77.888.999/0001-33", cpf: "321.654.987-55",
      atividade: "Pequenas reformas", cnae: "4330-4/00", cidade: "São Paulo - SP", telefone: "(11) 95544-3322",
      email: "carlos@email.com", valor_mensal: 160, vencimento_dia: 20, status_contrato: "ativo",
      tem_parcelamento: false, tem_guias: false, possui_faturamento: false, observacoes: "",
    },
    {
      id: "cl5", nome: "Beatriz Costa MEI", cnpj: "11.222.333/0001-44", cpf: "111.222.333-55",
      atividade: "Designer gráfico", cnae: "7410-2/01", cidade: "São Bernardo - SP", telefone: "(11) 94433-2211",
      email: "beatriz@email.com", valor_mensal: 170, vencimento_dia: 10, status_contrato: "suspenso",
      tem_parcelamento: false, tem_guias: false, possui_faturamento: false,
      observacoes: "Contrato suspenso desde janeiro. Aguardando retorno.",
    },
  ];

  const monitoramentos: Monitoramento[] = [
    makeMon("cl1", "2026-06", "verde", "aprovado", "sem_parcelamento", ALL, "", "Mês 100% concluído."),
    makeMon("cl2", "2026-06", "verde", "aprovado", "em_parcelamento", { ...ALL, guia_parcelamento: true }, "", "Parcelamento em dia."),
    makeMon("cl3", "2026-06", "amarelo", "entregue", "sem_parcelamento", { ...ALL, envio_painel: false, levantamento_fat: false }, "Painel e levantamento pendentes."),
    makeMon("cl4", "2026-06", "verde", "aprovado", "sem_parcelamento", ALL),
    makeMon("cl1", "2026-07", "verde", "aprovado", "sem_parcelamento", ALL, "", "Concluído."),
    makeMon("cl2", "2026-07", "amarelo", "entregue", "em_parcelamento", { ...ALL, guia_parcelamento: true, guia_das: false, levantamento_fat: false }, "DAS ainda não pago."),
    makeMon("cl3", "2026-07", "vermelho", "nao_entregue", "sem_parcelamento", NONE, "Cliente não responde aos contatos.", "Risco de inadimplência."),
    makeMon("cl4", "2026-07", "verde", "aprovado", "sem_parcelamento", ALL),
    makeMon("cl1", cur, "verde", "entregue", "sem_parcelamento", { ...ALL, envio_painel: false, levantamento_fat: false }, "Aguardando envio do painel."),
    makeMon("cl2", cur, "amarelo", "entregue", "em_parcelamento", { ...ALL, conciliacao: false, guia_parcelamento: true, guia_das: false, envio_painel: false, levantamento_fat: false }, "Documentos pendentes. DAS em aberto."),
    makeMon("cl3", cur, "vermelho", "nao_entregue", "sem_parcelamento", NONE, "Nenhum contato este mês.", "ATENÇÃO: cliente em risco."),
    makeMon("cl4", cur, "amarelo", "entregue", "sem_parcelamento", { ...ALL, guia_das: false, faturamento_acum: false, relatorio_mensal: false, envio_painel: false, levantamento_fat: false }, "DAS e relatório pendentes."),
  ];

  const parcelamentos: DB["parcelamentos"] = [
    {
      id: "p1", cliente_id: "cl2", descricao: "Parcelamento Simples DAS", competencia_origem: "2026-05",
      total_parcelas: 6, valor_total: 1200,
      parcelas: [
        { n: 1, valor: 200, vencimento: "2026-06-10", pago: true, data_pago: "2026-06-08" },
        { n: 2, valor: 200, vencimento: "2026-07-10", pago: true, data_pago: "2026-07-12" },
        { n: 3, valor: 200, vencimento: "2026-08-10", pago: false, data_pago: null },
        { n: 4, valor: 200, vencimento: "2026-09-10", pago: false, data_pago: null },
        { n: 5, valor: 200, vencimento: "2026-10-10", pago: false, data_pago: null },
        { n: 6, valor: 200, vencimento: "2026-11-10", pago: false, data_pago: null },
      ],
    },
    {
      id: "p2", cliente_id: "cl3", descricao: "Parcelamento Federal DARF", competencia_origem: "2026-04",
      total_parcelas: 3, valor_total: 450,
      parcelas: [
        { n: 1, valor: 150, vencimento: "2026-06-20", pago: true, data_pago: "2026-06-25" },
        { n: 2, valor: 150, vencimento: "2026-07-20", pago: false, data_pago: null },
        { n: 3, valor: 150, vencimento: "2026-08-20", pago: false, data_pago: null },
      ],
    },
  ];

  const guias: DB["guias"] = [
    { id: "g1", cliente_id: "cl1", tipo: "DAS", competencia: "2026-07", valor: 66, vencimento: "2026-07-20", status: "paga", data_pago: "2026-07-18" },
    { id: "g2", cliente_id: "cl1", tipo: "DAS", competencia: cur, valor: 66, vencimento: cur + "-20", status: "pendente", data_pago: null },
    { id: "g3", cliente_id: "cl2", tipo: "DAS", competencia: "2026-06", valor: 66, vencimento: "2026-06-20", status: "paga", data_pago: "2026-06-19" },
    { id: "g4", cliente_id: "cl2", tipo: "DARF", competencia: "2026-05", valor: 150, vencimento: "2026-05-30", status: "atrasada", data_pago: null },
    { id: "g5", cliente_id: "cl2", tipo: "DAS", competencia: cur, valor: 66, vencimento: cur + "-20", status: "pendente", data_pago: null },
  ];

  const db: DB = {
    competencias,
    clientes,
    monitoramentos,
    parcelamentos,
    guias,
    faturamentos: [],
    config: { limite_anual_mei: LIMITE_MEI_PADRAO },
  };
  garantirFaturamentos(db);

  const ano = new Date().getFullYear();
  const demo: Record<string, number[]> = {
    cl1: [4200, 3800, 5100, 4700, 4900, 5300, 5000, 0, 0, 0, 0, 0],
    cl2: [6100, 5900, 6400, 6800, 7100, 6600, 7000, 0, 0, 0, 0, 0],
    cl3: [7300, 7800, 8100, 7900, 8400, 8000, 8200, 0, 0, 0, 0, 0],
    cl4: [1200, 900, 1500, 1100, 1300, 1000, 1400, 0, 0, 0, 0, 0],
    cl5: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  Object.entries(demo).forEach(([id, meses]) => {
    const f = db.faturamentos.find((x) => x.cliente_id === id && x.ano === ano);
    if (f) f.meses = [...meses];
  });
  sincronizarMonitoramentos(db);

  return db;
}
