import "server-only";
import { sql, type Tx } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import { notifyCircle, type SmsRecipient } from "@/lib/db/queries/notifications";
import type { Category, Mobility, PlanRow, QuestStatus, Role, Visibility, WishRow } from "@/lib/db/types";

export type WishSummary = {
  id: string;
  text: string;
  category: Category;
  visibility: Visibility;
  created_at: Date;
  open_quests: number;
  /** Most recently updated in-progress quest, for "Tom is booking transport". */
  active_quest: { title: string; status: QuestStatus; claimer_name: string | null } | null;
  /** Every quest in the plan is done: the wish is shown greyed out and can't be re-planned or changed. */
  done: boolean;
};

/**
 * Wishes in a circle the viewer may see (same rule as authz.canSeeWish), with quest
 * summary, in a single query.
 */
export async function listVisibleWishes(circleId: string, userId: string, limit = 20): Promise<WishSummary[]> {
  return sql<WishSummary[]>`
    select w.id, w.text, w.category, w.visibility, w.created_at,
      coalesce(q.open_quests, 0)::int as open_quests,
      aq.active_quest,
      (exists (select 1 from quests dq where dq.wish_id = w.id) and not exists (select 1 from quests dq where dq.wish_id = w.id and dq.status <> 'done')) as done
    from wishes w
    left join lateral (
      select count(*) filter (where status = 'open') as open_quests from quests where wish_id = w.id
    ) q on true
    left join lateral (
      select json_build_object('title', qq.title, 'status', qq.status, 'claimer_name', u.name) as active_quest
      from quests qq left join users u on u.id = qq.claimed_by_user_id
      where qq.wish_id = w.id and qq.status = 'in_progress'
      order by qq.updated_at desc limit 1
    ) aq on true
    where w.circle_id = ${circleId}
      and (
        w.author_id = ${userId}
        or w.visibility = 'circle'
        or (w.visibility = 'chosen' and exists (select 1 from wish_viewers v where v.wish_id = w.id and v.user_id = ${userId}))
      )
    order by done, w.created_at desc
    limit ${limit}`;
}

export type WishDetail = WishRow & {
  author_name: string | null;
  viewer_ids: string[];
  viewer_role: Role;
  done: boolean;
};

/**
 * The wish plus everything authz needs (viewer's role, chosen viewers). Null when the user
 * isn't a member of the wish's circle. Callers must still run authz.canSeeWish.
 */
export async function findWishForMember(wishId: string, userId: string): Promise<WishDetail | null> {
  const [row] = await sql<WishDetail[]>`
    select w.*, u.name as author_name, m.role as viewer_role,
      (exists (select 1 from quests dq where dq.wish_id = w.id) and not exists (select 1 from quests dq where dq.wish_id = w.id and dq.status <> 'done')) as done,
      coalesce((select array_agg(v.user_id) from wish_viewers v where v.wish_id = w.id), '{}') as viewer_ids
    from wishes w
    join memberships m on m.circle_id = w.circle_id and m.user_id = ${userId}
    left join users u on u.id = w.author_id
    where w.id = ${wishId}`;
  return row ?? null;
}

type WishInput = { text: string; category: Category; visibility: Visibility; viewerIds: string[] };

/** Only circle members can be chosen viewers; anyone else in the list is ignored. */
async function setViewers(tx: Tx, wishId: string, circleId: string, visibility: Visibility, viewerIds: string[]) {
  await tx`delete from wish_viewers where wish_id = ${wishId}`;
  if (visibility !== "chosen" || viewerIds.length === 0) return;
  await tx`
    insert into wish_viewers (wish_id, user_id)
    select ${wishId}, m.user_id from memberships m
    where m.circle_id = ${circleId} and m.user_id = any(${viewerIds}::uuid[])
    on conflict do nothing`;
}

/** Feed entry that never reveals text the circle can't see. Private wishes leave no trace. */
async function wishActivity(tx: Tx, circleId: string, actorId: string, wishId: string, w: WishInput) {
  if (w.visibility === "private") return;
  await insertActivity(tx, {
    circleId,
    actorId,
    type: "wish_added",
    wishId,
    refId: wishId,
    payload: w.visibility === "circle" ? { text: w.text, category: w.category } : { category: w.category, chosen: true },
  });
}

export async function createWish(circleId: string, authorId: string, w: WishInput): Promise<WishRow & { sms: SmsRecipient[] }> {
  return sql.begin(async (tx) => {
    const [wish] = await tx<WishRow[]>`
      insert into wishes (circle_id, author_id, text, category, visibility)
      values (${circleId}, ${authorId}, ${w.text}, ${w.category}, ${w.visibility})
      returning *`;
    await setViewers(tx, wish!.id, circleId, w.visibility, w.viewerIds);
    await wishActivity(tx, circleId, authorId, wish!.id, w);
    const sms = await notifyCircle(tx, { circleId, actorId: authorId, wishId: wish!.id, kind: "wish", title: w.text, url: `/wishes/${wish!.id}` });
    return Object.assign(wish!, { sms });
  });
}

/** Author edits. Widening from private posts the feed entry the circle never got. */
export async function updateWish(wishId: string, authorId: string, w: WishInput): Promise<(WishRow & { sms: SmsRecipient[] }) | null> {
  return sql.begin(async (tx) => {
    const [before] = await tx<WishRow[]>`select * from wishes where id = ${wishId} and author_id = ${authorId} for update`;
    if (!before) return null;
    const [wish] = await tx<WishRow[]>`
      update wishes set text = ${w.text}, category = ${w.category}, visibility = ${w.visibility}
      where id = ${wishId} returning *`;
    await setViewers(tx, wishId, before.circle_id, w.visibility, w.viewerIds);
    // Private wishes keep their quests locked; sharing unlocks them (and narrowing locks open ones).
    if (w.visibility === "private") {
      await tx`update quests set status = 'locked', updated_at = now() where wish_id = ${wishId} and status = 'open'`;
    } else {
      await tx`update quests set status = 'open', updated_at = now() where wish_id = ${wishId} and status = 'locked'`;
    }
    let sms: SmsRecipient[] = [];
    if (before.visibility === "private" && w.visibility !== "private") {
      await wishActivity(tx, before.circle_id, authorId, wishId, w);
      sms = await notifyCircle(tx, { circleId: before.circle_id, actorId: authorId, wishId, kind: "wish", title: w.text, url: `/wishes/${wishId}` });
    }
    return Object.assign(wish!, { sms });
  });
}

export type PlanWithQuests = PlanRow & {
  quests: {
    id: string;
    title: string;
    status: QuestStatus;
    needs_care_team: boolean;
    claimed_by_user_id: string | null;
    claimer_name: string | null;
  }[];
};

/** Latest plan for a wish with its quests, in one query. */
export async function findLatestPlan(wishId: string): Promise<PlanWithQuests | null> {
  const [row] = await sql<PlanWithQuests[]>`
    select p.*,
      coalesce((
        select json_agg(json_build_object(
          'id', q.id, 'title', q.title, 'status', q.status,
          'needs_care_team', q.needs_care_team, 'claimed_by_user_id', q.claimed_by_user_id,
          'claimer_name', u.name) order by q.position)
        from quests q left join users u on u.id = q.claimed_by_user_id
        where q.wish_id = p.wish_id
      ), '[]') as quests
    from plans p where p.wish_id = ${wishId}
    order by p.generated_at desc limit 1`;
  return row ?? null;
}

/**
 * Saves a generated plan. Earlier plans stay as history; existing quests (open, in progress,
 * done, locked) carry forward to the new plan, and the new quests are appended. Quests on a
 * private wish start locked.
 */
export async function savePlan(input: {
  wish: Pick<WishRow, "id" | "circle_id" | "text" | "visibility">;
  actorId: string;
  mobility: Mobility;
  output: { plan: string; needsCareTeam: boolean; careTeamNote: string | null; quests: { title: string; needsCareTeam: boolean }[] };
}): Promise<PlanRow & { sms: SmsRecipient[] }> {
  const { wish, output } = input;
  return sql.begin(async (tx) => {
    const [plan] = await tx<PlanRow[]>`
      insert into plans (wish_id, text, based_on_mobility, needs_care_team, care_team_note)
      values (${wish.id}, ${output.plan}, ${input.mobility}, ${output.needsCareTeam},
              ${output.needsCareTeam ? output.careTeamNote : null})
      returning *`;
    await tx`update quests set plan_id = ${plan!.id} where wish_id = ${wish.id}`;
    const [pos] = await tx<{ next: number }[]>`
      select coalesce(max(position) + 1, 0)::int as next from quests where wish_id = ${wish.id}`;
    const next = pos?.next ?? 0;
    const status = wish.visibility === "private" ? "locked" : "open";
    for (const [i, q] of output.quests.entries()) {
      await tx`
        insert into quests (wish_id, plan_id, title, status, needs_care_team, position)
        values (${wish.id}, ${plan!.id}, ${q.title.slice(0, 120)}, ${status}, ${q.needsCareTeam}, ${next + i})`;
    }
    if (wish.visibility !== "private") {
      await insertActivity(tx, {
        circleId: wish.circle_id,
        actorId: input.actorId,
        type: "plan_generated",
        wishId: wish.id,
        refId: plan!.id,
        payload: { wish: wish.text },
      });
    }
    const sms = await notifyCircle(tx, { circleId: wish.circle_id, actorId: input.actorId, wishId: wish.id, kind: "plan", title: wish.text, url: `/wishes/${wish.id}` });
    return Object.assign(plan!, { sms });
  });
}
