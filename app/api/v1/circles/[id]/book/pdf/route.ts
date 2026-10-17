import { z } from "zod";
import { route, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { parseOrder } from "@/lib/bookOrder";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { listCardsForExport } from "@/lib/db/queries/cards";
import { appUrl } from "@/lib/env";
import { buildBookPdf } from "@/lib/pdf/buildBook";

export const maxDuration = 60;

/**
 * Photo book as a PDF, streamed as a download: GET ?order=date|category&qr=1
 * Only cards this member may see are included.
 */
export const GET = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const order = parseOrder(req.nextUrl.searchParams.get("order"));
  const withQr = req.nextUrl.searchParams.get("qr") === "1";

  const started = Date.now();
  const cards = await listCardsForExport(circle.id, user.id);
  const stream = await buildBookPdf({ patientName: circle.patient_name, cards, order, withQr, appUrl: appUrl() });
  log.info("book pdf", { circleId: circle.id, cards: cards.length, order, withQr, ms: Date.now() - started });

  const file = `${circle.patient_name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "1stquest"}-book.pdf`;
  return new Response(stream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "cache-control": "private, no-store",
    },
  });
});
