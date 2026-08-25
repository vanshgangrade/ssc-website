import { auth } from "@/lib/auth";
import RecommendationForm from "@/components/RecommendationForm";

export default async function WhatToScreenNextPage() {
  const session = await auth();

  const sessionSummary = session?.user
    ? {
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        isAdmin: session.user.isAdmin,
      }
    : null;

  return <RecommendationForm session={sessionSummary} />;
}
