import ReviewClient from "../../components/review-client";
import PortalShell from "../../components/portal-shell";

export default async function ReviewPage({ searchParams }) {
  const params = await searchParams;
  const initialLawyer = typeof params?.lawyer === "string" ? params.lawyer : "";

  return (
    <PortalShell
      title="Review Page"
      description="This page allows you to see and manage reviews, insights, and feedback."
    >
      <ReviewClient initialLawyer={initialLawyer} />
    </PortalShell>
  );
}
