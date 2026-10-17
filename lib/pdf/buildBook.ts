import "server-only";
import { Readable } from "node:stream";
import QRCode from "qrcode";
import sharp from "sharp";
import { renderToStream } from "@react-pdf/renderer";
import { orderPages, type BookOrder } from "@/lib/bookOrder";
import type { ExportCard } from "@/lib/db/queries/cards";
import { downloadObject } from "@/lib/storage";
import { BookDocument, type PdfPage } from "@/lib/pdf/BookDocument";

const MAX_PHOTOS_PER_PAGE = 3;

async function photoForPrint(path: string): Promise<string | null> {
  const buf = await downloadObject(path);
  if (!buf) return null;
  const jpg = await sharp(buf).resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

/** Runs `fn` over items with limited concurrency (keeps memory and Storage calls in check). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]!);
      }
    }),
  );
  return out;
}

export function mediaLink(appUrl: string, mediaId: string): string {
  return `${appUrl}/m/${mediaId}`;
}

export async function buildBookPdf(input: {
  patientName: string;
  cards: ExportCard[];
  order: BookOrder;
  withQr: boolean;
  appUrl: string;
}): Promise<ReadableStream<Uint8Array>> {
  const ordered = orderPages(input.cards, input.order);
  const pages: PdfPage[] = await mapLimit(ordered, 4, async (c) => {
    const photos = (await Promise.all(c.photos.slice(0, MAX_PHOTOS_PER_PAGE).map((p) => photoForPrint(p.path)))).filter(
      (x): x is string => Boolean(x),
    );
    const qrs = input.withQr
      ? await Promise.all(
          c.recordings.map(async (r) => ({
            image: await QRCode.toDataURL(mediaLink(input.appUrl, r.id), { margin: 1, width: 300, color: { dark: "#33261A", light: "#FFFFFF" } }),
            caption: `Scan for ${r.uploader_name ? `${r.uploader_name}’s` : "the"} ${r.kind === "voice" ? "voice note" : "video"}`,
          })),
        )
      : [];
    return {
      id: c.id,
      title: c.title,
      body: c.body,
      category: c.category,
      dateLabel: c.happened_on.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      place: c.place,
      authorName: c.author_name,
      gold: c.level > 0,
      photos,
      qrs,
    };
  });

  const n = pages.length;
  const subtitle = n === 0 ? "The first pages are still to come." : `${n === 1 ? "1 card" : `${n} cards`} · made together`;
  const nodeStream = await renderToStream(BookDocument({ patientName: input.patientName, subtitle, pages }));
  return Readable.toWeb(nodeStream as unknown as Readable) as ReadableStream<Uint8Array>;
}
