import { notFound } from "next/navigation";
import { canSeeCard } from "@/lib/authz";
import { requirePageUser } from "@/lib/auth/session";
import { findCardForMember } from "@/lib/db/queries/cards";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { CardReveal } from "./CardReveal";

export const dynamic = "force-dynamic";

function creditLine(photos: number, storyBy: string): string {
  if (photos === 0) return `Made from ${storyBy} story`;
  return `Made from ${photos === 1 ? "1 photo" : `${photos} photos`} and ${storyBy} story`;
}

export default async function NewCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/cards/${id}/new`);
  const card = /^[0-9a-f-]{36}$/i.test(id) ? await findCardForMember(id, user.id) : null;
  if (!card || !canSeeCard({ userId: user.id, role: card.viewer_role }, card, card.viewer_ids)) notFound();
  const circle = await findCircleForMember(card.circle_id, user.id);

  return (
    <CardReveal
      card={{
        id: card.id,
        title: card.title,
        body: card.body,
        category: card.category,
        coverId: card.cover_media_id,
        dateLabel: card.happened_on.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }),
        credit: creditLine(card.photo_ids.length, card.author_id === user.id ? "your" : `${card.author_name ?? "someone"}’s`),
        wishText: card.wish_text,
        canEdit: card.author_id === user.id,
      }}
      patientName={circle?.patient_name ?? ""}
    />
  );
}
