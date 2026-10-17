import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import sharp from "sharp";
import { renderToBuffer } from "@react-pdf/renderer";
import { orderPages, parseOrder } from "@/lib/bookOrder";
import { BookDocument } from "@/lib/pdf/BookDocument";
import { mediaLink } from "@/lib/pdf/buildBook";

const d = (m: number, day: number) => new Date(Date.UTC(2026, m - 1, day));

describe("orderPages", () => {
  const cards = [
    { id: "a", category: "tastes" as const, happened_on: d(9, 21), created_at: d(9, 21) },
    { id: "b", category: "places" as const, happened_on: d(10, 11), created_at: d(10, 11) },
    { id: "c", category: "nature" as const, happened_on: d(10, 5), created_at: d(10, 5) },
    { id: "e", category: "places" as const, happened_on: d(8, 1), created_at: d(8, 1) },
  ];
  it("by date reads oldest first", () => {
    expect(orderPages(cards, "date").map((c) => c.id)).toEqual(["e", "a", "c", "b"]);
  });
  it("by category follows the app's category order, then date", () => {
    expect(orderPages(cards, "category").map((c) => c.id)).toEqual(["e", "b", "a", "c"]);
  });
  it("defaults to date for anything unexpected", () => {
    expect(parseOrder("category")).toBe("category");
    expect(parseOrder("nonsense")).toBe("date");
  });
});

describe("book PDF", () => {
  it("renders a cover plus one page per card, with photos and QR codes", async () => {
    const jpg = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#A4C4DF" } }).jpeg().toBuffer();
    const photo = `data:image/jpeg;base64,${jpg.toString("base64")}`;
    const qr = await QRCode.toDataURL(mediaLink("https://example.test", "11111111-1111-1111-1111-111111111111"));
    const pdf = await renderToBuffer(
      BookDocument({
        patientName: "Nana Rose",
        subtitle: "2 cards · made together",
        pages: [
          { id: "1", title: "The wind took Nana’s hat", body: "A slow, sunny morning.", category: "places", dateLabel: "11 October 2026", place: "Bondi", authorName: "Ploy", gold: true, photos: [photo, photo], qrs: [{ image: qr, caption: "Scan for Ploy’s voice note" }] },
          { id: "2", title: "Jacarandas", body: "Purple everywhere.", category: "nature", dateLabel: "5 October 2026", place: null, authorName: null, gold: false, photos: [], qrs: [] },
        ],
      }),
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBe(3);
  }, 30_000);

  it("QR codes point at the members-only media page", () => {
    expect(mediaLink("https://wish-circle.example", "abc")).toBe("https://wish-circle.example/m/abc");
  });
});
