import "server-only";
import { sql, type Tx } from "@/lib/db/client";
import { notifyMembers, type SmsRecipient } from "@/lib/db/queries/notifications";
import { MEMORIAL_HOLD_DAYS } from "@/lib/memorial";

export type OpenMemorialRequest = {
  id: string;
  requested_by: string;
  requester_name: string | null;
  confirmed_by: string | null;
  confirmer_name: string | null;
  takes_effect_at: Date | null;
};

export async function findOpenRequest(circleId: string): Promise<OpenMemorialRequest | null> {
  const [row] = await sql<OpenMemorialRequest[]>`
    select r.id, r.requested_by, ru.name as requester_name, r.confirmed_by, cu.name as confirmer_name, r.takes_effect_at
    from memorial_requests r
    left join users ru on ru.id = r.requested_by
    left join users cu on cu.id = r.confirmed_by
    where r.circle_id = ${circleId} and r.closed_at is null`;
  return row ?? null;
}

/** The owner and caretakers: they can cancel a request, so they're always texted about one. */
async function managersOf(tx: Tx, circleId: string): Promise<string[]> {
  const rows = await tx<{ user_id: string }[]>`select user_id from memberships where circle_id = ${circleId} and role in ('owner', 'caretaker')`;
  return rows.map((r) => r.user_id);
}

/** The owner or a caretaker names a viewer (or no one). Anyone else is refused. */
export async function setTrusted(circleId: string, userId: string | null): Promise<boolean> {
  const rows = userId
    ? await sql`
        update circles set trusted_user_id = ${userId} where id = ${circleId}
          and exists (select 1 from memberships m where m.circle_id = ${circleId} and m.user_id = ${userId} and m.role in ('viewer', 'health'))
        returning id`
    : await sql`update circles set trusted_user_id = null where id = ${circleId} returning id`;
  return rows.length > 0;
}

type Ctx = { circleId: string; patientName: string };
const bookTitle = (c: Ctx) => `${c.patientName}’s book`;

/**
 * Turns the book into a memorial album and makes `newCaretakerId` a caretaker so someone can keep
 * looking after it, in one transaction. Nobody else's role changes.
 */
async function handOver(tx: Tx, c: Ctx, newCaretakerId: string): Promise<SmsRecipient[]> {
  await tx`update memberships set role = 'caretaker' where circle_id = ${c.circleId} and user_id = ${newCaretakerId} and role in ('viewer', 'health')`;
  await tx`update circles set mode = 'memorial', mode_changed_at = now(), trusted_user_id = null where id = ${c.circleId}`;
  await tx`
    update memorial_requests set closed_at = now(), outcome = 'switched', closed_by = ${newCaretakerId}
    where circle_id = ${c.circleId} and closed_at is null`;
  return notifyMembers(tx, { circleId: c.circleId, actorId: newCaretakerId, kind: "memorial_switched", title: bookTitle(c), url: "/home" });
}

/** The trusted person switches straight away. Null when they're no longer trusted or it's already done. */
export async function trustedSwitch(c: Ctx, userId: string): Promise<SmsRecipient[] | null> {
  return sql.begin(async (tx) => {
    const ok = await tx`
      select 1 from circles ci join memberships m on m.circle_id = ci.id and m.user_id = ${userId} and m.role in ('viewer', 'health')
      where ci.id = ${c.circleId} and ci.mode = 'active' and ci.trusted_user_id = ${userId}
      for update of ci`;
    if (!ok.length) return null;
    return handOver(tx, c, userId);
  });
}

/** A viewer asks. Null when a request is already open (one per circle). */
export async function askMemorial(c: Ctx, userId: string): Promise<SmsRecipient[] | null> {
  return sql.begin(async (tx) => {
    const rows = await tx`
      insert into memorial_requests (circle_id, requested_by) values (${c.circleId}, ${userId})
      on conflict (circle_id) where closed_at is null do nothing
      returning id`;
    if (!rows.length) return null;
    return notifyMembers(tx, {
      circleId: c.circleId,
      actorId: userId,
      kind: "memorial_asked",
      title: bookTitle(c),
      url: "/circle",
      alwaysText: await managersOf(tx, c.circleId),
    });
  });
}

/** A second viewer confirms; the switch happens 7 days later unless the owner or a caretaker cancels. */
export async function confirmMemorial(c: Ctx, userId: string): Promise<{ sms: SmsRecipient[]; takesEffectAt: Date } | null> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ takes_effect_at: Date }[]>`
      update memorial_requests
      set confirmed_by = ${userId}, confirmed_at = now(), takes_effect_at = now() + make_interval(days => ${MEMORIAL_HOLD_DAYS})
      where circle_id = ${c.circleId} and closed_at is null and confirmed_by is null and requested_by <> ${userId}
      returning takes_effect_at`;
    if (!row) return null;
    const managers = await managersOf(tx, c.circleId);
    const when = row.takes_effect_at.toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" });
    const sms = await notifyMembers(tx, {
      circleId: c.circleId,
      actorId: userId,
      kind: "memorial_confirmed",
      title: `${bookTitle(c)} becomes a memorial album on ${when} unless a caretaker cancels`,
      url: "/circle",
      alwaysText: managers,
    });
    return { sms, takesEffectAt: row.takes_effect_at };
  });
}

/** The owner or a caretaker ("I'm still here"), or one of the two viewers, cancels. */
export async function cancelMemorial(c: Ctx, userId: string): Promise<SmsRecipient[] | null> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ requested_by: string; confirmed_by: string | null }[]>`
      update memorial_requests set closed_at = now(), outcome = 'cancelled', closed_by = ${userId}
      where circle_id = ${c.circleId} and closed_at is null
      returning requested_by, confirmed_by`;
    if (!row) return null;
    const ids = [row.requested_by, row.confirmed_by, ...(await managersOf(tx, c.circleId))].filter((x): x is string => !!x);
    return notifyMembers(tx, { circleId: c.circleId, actorId: userId, kind: "memorial_cancelled", title: bookTitle(c), url: "/circle", userIds: ids });
  });
}

/**
 * Carries out a confirmed request once its 7 days are up (checked whenever someone opens the
 * circle; no scheduler needed). The viewer who asked becomes a caretaker. Null when nothing was due.
 */
export async function applyDueRequest(c: Ctx): Promise<{ sms: SmsRecipient[] } | null> {
  // Cheap check first: this runs on every page load of an active circle.
  const [any] = await sql`select 1 from memorial_requests where circle_id = ${c.circleId} and closed_at is null and takes_effect_at <= now()`;
  if (!any) return null;
  return sql.begin(async (tx) => {
    const [due] = await tx<{ id: string; requested_by: string }[]>`
      select r.id, r.requested_by from memorial_requests r
      join memberships m on m.circle_id = r.circle_id and m.user_id = r.requested_by and m.role in ('viewer', 'health')
      where r.circle_id = ${c.circleId} and r.closed_at is null and r.takes_effect_at <= now()
      for update of r skip locked`;
    if (!due) return null;
    return { sms: await handOver(tx, c, due.requested_by) };
  });
}
