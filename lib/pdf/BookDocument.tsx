/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> renders into a PDF and has no alt prop. */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CATEGORY_LABEL } from "@/lib/activityText";
import type { Category } from "@/lib/db/types";

export type PdfPage = {
  id: string;
  title: string;
  body: string;
  category: Category;
  dateLabel: string;
  place: string | null;
  authorName: string | null;
  gold: boolean;
  /** JPEG data URIs, already downsized. */
  photos: string[];
  /** PNG data URIs with captions. */
  qrs: { image: string; caption: string }[];
};

const INK = "#33261A";
const INK3 = "#7A6650";
const PRIMARY = "#8A5300";
const LINE = "#F3E2C6";
const GOLD = "#D99A1E";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },
  cover: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFAF3", padding: 40 },
  coverKicker: { fontSize: 13, color: INK3, marginBottom: 10 },
  coverTitle: { fontSize: 34, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverSub: { fontSize: 13, color: INK3, marginTop: 14, textAlign: "center" },
  photoMain: { width: "100%", height: 300, objectFit: "cover", borderRadius: 8 },
  photoRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  photoSmall: { flex: 1, height: 120, objectFit: "cover", borderRadius: 6 },
  meta: { fontSize: 10, color: PRIMARY, fontFamily: "Helvetica-Bold", marginTop: 18, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6, lineHeight: 1.25 },
  body: { fontSize: 12.5, lineHeight: 1.6, marginTop: 10, color: "#4A3926" },
  credit: { fontSize: 10, color: INK3, marginTop: 12 },
  qrRow: { flexDirection: "row", gap: 16, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINE },
  qrBox: { width: 110, alignItems: "center" },
  qr: { width: 90, height: 90 },
  qrCaption: { fontSize: 8.5, color: INK3, textAlign: "center", marginTop: 4 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: INK3 },
  goldBar: { height: 4, backgroundColor: GOLD, borderRadius: 2, marginBottom: 12 },
});

export function BookDocument({ patientName, subtitle, pages }: { patientName: string; subtitle: string; pages: PdfPage[] }) {
  return (
    <Document title={`${patientName}’s book`} author="1stQuest" creator="1stQuest">
      <Page size="A4" style={{ fontFamily: "Helvetica" }}>
        <View style={s.cover}>
          <Text style={s.coverKicker}>1stQuest</Text>
          <Text style={s.coverTitle}>{patientName}’s book</Text>
          <Text style={s.coverSub}>{subtitle}</Text>
        </View>
      </Page>
      {pages.map((p) => (
        <Page key={p.id} size="A4" style={s.page} wrap={false}>
          {p.gold && <View style={s.goldBar} />}
          {p.photos[0] && <Image src={p.photos[0]} style={s.photoMain} />}
          {p.photos.length > 1 && (
            <View style={s.photoRow}>
              {p.photos.slice(1, 3).map((src, i) => (
                <Image key={i} src={src} style={s.photoSmall} />
              ))}
            </View>
          )}
          <Text style={s.meta}>
            {[CATEGORY_LABEL[p.category], p.dateLabel, p.place].filter(Boolean).join("  ·  ")}
          </Text>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.body}>{p.body}</Text>
          {p.authorName && <Text style={s.credit}>Shared by {p.authorName}</Text>}
          {p.qrs.length > 0 && (
            <View style={s.qrRow}>
              {p.qrs.map((q, i) => (
                <View key={i} style={s.qrBox}>
                  <Image src={q.image} style={s.qr} />
                  <Text style={s.qrCaption}>{q.caption}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={s.footer} fixed>
            <Text>{patientName}’s book</Text>
            <Text render={({ pageNumber }) => `${pageNumber}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
