import "server-only";
import { ai } from "@/lib/ai";
import type { CardInput, CardOutput } from "@/lib/ai/types";
import { lintText } from "@/lib/copyLint";
import { forModel } from "@/lib/images";
import { downloadObject } from "@/lib/storage";

/** Loads up to 4 of the card's photos (downsized) for the model. Missing ones are skipped. */
export async function photosForModel(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths.slice(0, 4)) {
    const buf = await downloadObject(p);
    if (buf) out.push(await forModel(buf));
  }
  return out;
}

/** Card words from the model; if a draft uses a word the app avoids, ask once more. */
export async function writeCard(input: Omit<CardInput, "avoid">): Promise<CardOutput> {
  const first = await ai().card(input);
  const hits = lintText(`${first.title}\n${first.body}`);
  if (hits.length === 0) return first;
  const second = await ai().card({ ...input, avoid: [...new Set(hits.map((h) => h.label))] });
  return lintText(`${second.title}\n${second.body}`).length === 0 ? second : first;
}
