import MessagingClient from "../../components/messaging-client";
import PortalShell from "../../components/portal-shell";

export default function MessagingPage() {
  return (
    <PortalShell
      title="Lawyer referral and messaging"
      showEyebrow={false}
      heroClassName="messaging-hero portal-aligned-hero"
    >
      <MessagingClient />
    </PortalShell>
  );
}
