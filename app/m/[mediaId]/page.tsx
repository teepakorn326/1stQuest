import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { getUser } from "@/lib/auth/session";
import { findMediaForMember } from "@/lib/db/queries/media";
import { VoicePlayer } from "@/components/VoicePlayer";

export const dynamic = "force-dynamic";

/** Where the QR codes in a printed book point. Members only: everyone else signs in first. */
export default async function MediaLinkPage({ params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(mediaId)) notFound();
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/m/${mediaId}`)}`);
  const media = await findMediaForMember(mediaId, user.id);
  if (!media) notFound();
  const src = `/api/v1/media/${media.id}`;
  const what = media.kind === "voice" ? "Voice note" : media.kind === "video" ? "Video" : "Photo";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-5 px-6 pt-14 pb-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-primary-soft text-primary">
        <BookIcon size={28} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] text-ink-3">
          {what}
          {media.uploader_name ? ` from ${media.uploader_name}` : ""}
        </span>
        {media.card_title && <h1 className="m-0 text-2xl leading-tight font-bold">{media.card_title}</h1>}
      </div>
      {media.kind === "voice" ? (
        <VoicePlayer src={src} durationSec={media.duration_sec} />
      ) : media.kind === "video" ? (
        <video controls playsInline autoPlay src={src} className="w-full rounded-2xl bg-black" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full rounded-2xl" />
      )}
      {media.card_id && (
        <Link href={`/cards/${media.card_id}`} className="text-base font-bold no-underline">
          Open the card in the book
        </Link>
      )}
    </main>
  );
}
