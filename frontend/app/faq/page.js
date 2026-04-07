import FAQClient from "../../components/faq-client";
import PortalShell from "../../components/portal-shell";

export default function FAQPage() {
  return (
    <PortalShell
      title="Frequently asked questions"
      description="The FAQ page is separated from the chatbot and messaging flow so users can browse common legal questions directly."
      hideHero
    >
      <FAQClient />
    </PortalShell>
  );
}
