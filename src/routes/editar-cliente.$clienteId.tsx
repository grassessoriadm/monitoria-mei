import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/mei/AppShell";
import { ClienteForm, emptyCliente } from "@/components/mei/ClienteForm";
import { useStore } from "@/lib/mei/store";

export const Route = createFileRoute("/editar-cliente/$clienteId")({
  head: () => ({
    meta: [
      { title: "Editar cliente — GR Assessoria" },
      { name: "description", content: "Atualize os dados cadastrais e contratuais do cliente MEI." },
      { property: "og:title", content: "Editar cliente — GR Assessoria" },
      { property: "og:description", content: "Atualize dados cadastrais e contratuais do cliente MEI." },
    ],
  }),
  component: EditarCliente,
});

function EditarCliente() {
  const { clienteId } = useParams({ from: "/editar-cliente/$clienteId" });
  const { db, update } = useStore();
  const navigate = useNavigate();
  const cliente = db.clientes.find((c) => c.id === clienteId);

  if (!cliente) {
    return (
      <AppShell>
        <PageHeading title="Cliente não encontrado" subtitle="O registro pode ter sido removido." />
      </AppShell>
    );
  }

  const { id: _id, ...draft } = cliente;

  return (
    <AppShell>
      <PageHeading title={`Editar ${cliente.nome}`} subtitle="Atualize os dados cadastrais e contratuais" />
      <ClienteForm
        initial={{ ...emptyCliente, ...draft }}
        submitLabel="Salvar alterações"
        onSubmit={(next) => {
          update((d) => {
            const idx = d.clientes.findIndex((c) => c.id === clienteId);
            if (idx >= 0) d.clientes[idx] = { ...next, id: clienteId };
          });
          toast.success("Cliente atualizado.");
          navigate({ to: "/cliente/$clienteId", params: { clienteId } });
        }}
      />
    </AppShell>
  );
}