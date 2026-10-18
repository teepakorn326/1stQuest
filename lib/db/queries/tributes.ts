import "server-only";
import { sql } from "@/lib/db/client";

export type TributeKind = "candle" | "flower";
export type TributeMessage = { id: string; kind: TributeKind; message: string; name: string | null; created_at: Date };
export type TributeSummary = { candles: number; flowers: number; messages: TributeMessage[]; litToday: boolean; flowerToday: boolean };

/** Candle and flower counts, the newest messages, and whether this person already left one today. */
export async function tributeSummary(circleId: string, userId: string, messageLimit = 3): Promise<TributeSummary> {
  const [counts] = await sql<{ candles: number; flowers: number; lit_today: boolean; flower_today: boolean }[]>`
    select
      count(*) filter (where kind = 'candle')::int as candles,
      count(*) filter (where kind = 'flower')::int as flowers,
      bool_or(kind = 'candle' and user_id = ${userId} and created_at > now() - interval '1 day') as lit_today,
      bool_or(kind = 'flower' and user_id = ${userId} and created_at > now() - interval '1 day') as flower_today
    from memorial_tributes where circle_id = ${circleId}`;
  const messages = await sql<TributeMessage[]>`
    select t.id, t.kind, t.message, u.name, t.created_at
    from memorial_tributes t join users u on u.id = t.user_id
    where t.circle_id = ${circleId} and t.message is not null
    order by t.created_at desc limit ${messageLimit}`;
  return {
    candles: counts?.candles ?? 0,
    flowers: counts?.flowers ?? 0,
    messages,
    litToday: counts?.lit_today ?? false,
    flowerToday: counts?.flower_today ?? false,
  };
}

/** One candle and one flower per person a day; a repeat the same day is a no-op (returns false). */
export async function addTribute(input: { circleId: string; userId: string; kind: TributeKind; message: string | null }): Promise<boolean> {
  const rows = await sql`
    insert into memorial_tributes (circle_id, user_id, kind, message)
    select ${input.circleId}, ${input.userId}, ${input.kind}, ${input.message}
    where not exists (
      select 1 from memorial_tributes
      where circle_id = ${input.circleId} and user_id = ${input.userId} and kind = ${input.kind} and created_at > now() - interval '1 day'
    )
    returning id`;
  return rows.length > 0;
}

export async function setHeadstone(circleId: string, h: { birthYear: number | null; deathYear: number | null; epitaph: string | null }): Promise<void> {
  await sql`update circles set birth_year = ${h.birthYear}, death_year = ${h.deathYear}, epitaph = ${h.epitaph} where id = ${circleId}`;
}
