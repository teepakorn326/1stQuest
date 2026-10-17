import { redirect } from "next/navigation";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { orderPages, parseOrder } from "@/lib/bookOrder";
import { listCardsForExport } from "@/lib/db/queries/cards";
import { Slideshow } from "./Slideshow";

export const dynamic = "force-dynamic";

export default async function SlideshowPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = await requirePageUser("/slideshow");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const order = parseOrder((await searchParams).order);
  const cards = orderPages(await listCardsForExport(circle.id, user.id), order);

  return (
    <Slideshow
      name={circle.patient_name}
      memorial={circle.mode === "memorial"}
      slides={cards.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        meta: [CATEGORY_LABEL[c.category], c.happened_on.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), c.place]
          .filter(Boolean)
          .join(" · "),
        photoId: c.photos[0]?.id ?? null,
        gold: c.level > 0,
      }))}
    />
  );
}
