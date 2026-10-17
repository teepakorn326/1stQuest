import { CATEGORIES, type Category } from "@/lib/db/types";

export type BookOrder = "date" | "category";

/** A book reads forward: oldest first by date; by category in the app's category order, then by date. */
export function orderPages<T extends { category: Category; happened_on: Date; created_at: Date }>(cards: T[], order: BookOrder): T[] {
  const byDate = (a: T, b: T) => a.happened_on.getTime() - b.happened_on.getTime() || a.created_at.getTime() - b.created_at.getTime();
  const copy = [...cards];
  if (order === "date") return copy.sort(byDate);
  return copy.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || byDate(a, b));
}

export const parseOrder = (v: unknown): BookOrder => (v === "category" ? "category" : "date");
