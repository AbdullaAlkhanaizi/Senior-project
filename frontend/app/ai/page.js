import AIWorkspace from "../../components/ai-workspace";
import PortalShell from "../../components/portal-shell";

export default function AIPage() {
  return (
    <PortalShell
      title="AI assistant workspace"
      description="This page contains the chatbot shell only, so you can add your own legal AI logic later without mixing it with other screens."
    >
      <AIWorkspace />
    </PortalShell>
  );
}
