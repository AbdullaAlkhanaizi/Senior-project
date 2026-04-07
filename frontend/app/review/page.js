"use client";

import ReviewClient from "../../components/review-client";
import PortalShell from "../../components/portal-shell";

export default function ReviewPage() {
  return (
    <PortalShell
      title="Review Page"
      description="This page allows you to see and manage reviews, insights, and feedback."
    >
      <ReviewClient />
    </PortalShell>
  );
}