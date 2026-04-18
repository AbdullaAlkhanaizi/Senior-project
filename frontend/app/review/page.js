import ReviewClient from "../../components/review-client";
import PortalShell from "../../components/portal-shell";

export default async function ReviewPage({ searchParams }) {
  const params = await searchParams;
  const initialLawyer = typeof params?.lawyer === "string" ? params.lawyer : "";

  return (
    <PortalShell
      title="Ratings and reviews"
      showEyebrow={false}
      heroClassName="messaging-hero portal-aligned-hero"
    >
      <ReviewClient initialLawyer={initialLawyer} />
    </PortalShell>
  );
}
