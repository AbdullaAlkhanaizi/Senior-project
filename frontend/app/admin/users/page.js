import PortalShell from "../../../components/portal-shell";
import AdminUsersClient from "../../../components/admin-users-client";

export default function AdminUsersPage() {
  return (
    <PortalShell
      title="User management"
      description="Manage clients and lawyers on the platform."
      hideHero={true}
    >
      <AdminUsersClient />
    </PortalShell>
  );
}
