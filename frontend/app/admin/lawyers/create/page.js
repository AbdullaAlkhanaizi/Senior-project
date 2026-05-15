import PortalShell from "../../../../components/portal-shell";
import AdminLawyerCreateClient from "../../../../components/admin-lawyer-create-client";

export default function AdminLawyerCreatePage() {
  return (
    <PortalShell
      title="Create lawyer account"
      description="Add a new legal professional to the platform."
      hideHero={true}
    >
      <AdminLawyerCreateClient />
    </PortalShell>
  );
}
