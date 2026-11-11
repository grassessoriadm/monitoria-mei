import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/mei/AppShell";
import { ClienteForm, emptyCliente } from "@/components/mei/ClienteForm";
import { useStore } from "@/lib/mei/store";
import { nowISO, uid } from "@/lib/mei/format";

export const Route = createFileRoute("/novo-cliente")({
  head: () => ({
    meta: [
      { title: "Novo cliente — GR Assessoria" },
      { name: "description", content: "Cadastre um novo cliente MEI no monitoramento mensal da GR Assessoria." },
      { property: "og:title", content: "Novo cliente — GR Assessoria" },
      { property: "og:description", content: "Cadastro de cliente MEI no sistema de monitoramento mensal." },
    ],
  }),
  component: NovoCliente,
});

function NovoCliente() {
  const { update, comp } = useStore();
  const navigate = useNavigate();

  return (
    <AppShell>
      <PageHeading title="Novo cliente" subtitle="Cadastre um cliente para iniciar o monitoramento mensal" />
      <ClienteForm
        initial={emptyCliente}
        submitLabel="Salvar cliente"
        onSubmit={(draft) => {
          const id = uid();
          update((d) => {
            d.clientes.push({ ...draft, id });
            d.monitoramentos.push({
              id: uid(),
              cliente_id: id,
              competencia: comp,
              status_geral: "vermelho",
              status_relatorio: "nao_entregue",
              status_parcelamento: draft.tem_parcelamento ? "em_parcelamento" : "sem_parcelamento",
              checklist: {},
              dados_checklist: {},
              pendencias: "",
              alertas: "",
              updated_at: nowISO(),
            });
          });
          toast.success("Cliente cadastrado.");
          navigate({ to: "/cliente/$clienteId", params: { clienteId: id } });
        }}
      />
    </AppShell>
  );
}