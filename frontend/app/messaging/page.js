import MessagingClient from "../../components/messaging-client";
import PortalShell from "../../components/portal-shell";

export default function MessagingPage() {
  return (
    <PortalShell
      title="Lawyer referral and messaging"
      description="This page focuses on lawyer assignment, client-lawyer messages, file uploads, and progress tracking."
    >
      <MessagingClient />
    </PortalShell>
  );
}
