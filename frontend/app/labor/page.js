"use client";

import LaborCalculatorClient from "../../components/labor-calculator-client";
import PortalShell from "../../components/portal-shell";

export default function LaborCalculatorPage() {
  return (
    <PortalShell hideHero>
      <LaborCalculatorClient />
    </PortalShell>
  );
}
