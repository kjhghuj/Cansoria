import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
export const metadata: Metadata = {
  title: "Pet Portrait Reviews | Cansoria",
  robots: { index: false, follow: true },
  alternates: { canonical: "/reviews" },
  description:
    "No authorised customer reviews are currently available. Cansoria commissions are in preparation.",
};
export default function ReviewsPage() {
  return (
    <StudioPage
      eyebrow="Stories from pet families"
      title="Memories worth sharing."
      description="A portrait is personal. This is where we will share customer stories, with permission from the people behind them."
    >
      <section className="studio-empty">
        <h2>No customer reviews to share yet.</h2>
        <p>
          Commissions are in preparation, and no verified customer reviews are
          available for publication. We will share genuine feedback only with
          permission.
        </p>
        <Link href="/contact" className="studio-button mt-6">
          Contact Us →
        </Link>
      </section>
      <StudioCTA />
    </StudioPage>
  );
}
