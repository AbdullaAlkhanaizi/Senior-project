import HomeClient from "../../components/home-client";
import PortalShell from "../../components/portal-shell";

export default function HomePage() {
  return (
    <PortalShell
      title="Home hub for the legal consultant website"
      description="Use this page to direct users to the AI assistant, FAQ suggestions, or the lawyer messaging workspace."
    >
      <HomeClient />
    </PortalShell>
  );
}
