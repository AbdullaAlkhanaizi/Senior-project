import PortalShell from "../../../components/portal-shell";
import AdminStatisticsClient from "../../../components/admin-statistics-client";

export default function AdminStatisticsPage() {
  return (
    <PortalShell
      title="Admin statistics"
      description="Review platform metrics, AI usage, and operational visibility."
      hideHero={true}
    >
      <AdminStatisticsClient />
    </PortalShell>
  );
}
