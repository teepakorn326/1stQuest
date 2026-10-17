/**
 * Seeds the demo circle "Nana Rose". Re-running replaces the demo circle (and only it) so
 * timestamps stay fresh; demo users are upserted by email.
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(JSON.stringify({ level: "error", msg: "DIRECT_URL or DATABASE_URL must be set" }));
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

const DEMO_DOMAIN = "wishcircle.demo";
const people = {
  ploy: { name: "Ploy", role: "owner" },
  tom: { name: "Tom", role: "family" },
  krit: { name: "Krit", role: "family" },
  may: { name: "Aunt May", role: "family" },
  lin: { name: "Dr Lin", role: "doctor" },
} as const;
type Key = keyof typeof people;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function main() {
  await sql.begin(async (tx) => {
    // Users
    const ids = {} as Record<Key, string>;
    for (const [key, p] of Object.entries(people) as [Key, (typeof people)[Key]][]) {
      const [u] = await tx<{ id: string }[]>`
        insert into users (email, name) values (${`${key}@${DEMO_DOMAIN}`}, ${p.name})
        on conflict (email) do update set name = excluded.name
        returning id`;
      ids[key] = u!.id;
    }

    // Replace the previous demo circle (owned by Ploy, named Nana Rose).
    await tx`
      delete from circles c using memberships m
      where m.circle_id = c.id and m.user_id = ${ids.ploy} and m.role = 'owner' and c.patient_name = 'Nana Rose'`;

    const [circle] = await tx<{ id: string }[]>`
      insert into circles (patient_name, mobility, mobility_notes, set_up_by_patient, hemisphere, created_at)
      values ('Nana Rose', 'short_walks_with_help', 'Gets tired after about 20 minutes. Prefers mornings.', false, 'south', ${ago(60 * 24 * 40)})
      returning id`;
    const circleId = circle!.id;

    let joinedAt = 60 * 24 * 40;
    for (const key of Object.keys(people) as Key[]) {
      await tx`insert into memberships (circle_id, user_id, role, joined_at)
               values (${circleId}, ${ids[key]}, ${people[key].role}, ${ago(joinedAt--)})`;
    }

    // Wishes
    const wish = async (author: Key, text: string, category: string, minutesAgo: number) => {
      const [w] = await tx<{ id: string }[]>`
        insert into wishes (circle_id, author_id, text, category, visibility, created_at)
        values (${circleId}, ${ids[author]}, ${text}, ${category}, 'circle', ${ago(minutesAgo)})
        returning id`;
      return w!.id;
    };
    const bondi = await wish("ploy", "Feel the sea breeze at Bondi", "places", 60 * 24 * 14);
    const jok = await wish("ploy", "Cook her mum’s jok together", "tastes", 60 * 26);
    const market = await wish("may", "Sunday market dumplings at Cabramatta", "tastes", 60 * 24 * 30);

    // One plan with mixed quest states
    const [plan] = await tx<{ id: string }[]>`
      insert into plans (wish_id, text, based_on_mobility, needs_care_team, generated_at)
      values (${bondi}, ${"A slow morning at the north end of the beach. Park close to the ramp, borrow a beach wheelchair, and sit in the shade near the water."},
              'short_walks_with_help', true, ${ago(60 * 24 * 13)})
      returning id`;
    const quests: [string, string, Key | null, boolean, number][] = [
      ["Find a beach with ramp access", "done", "krit", false, 20],
      ["Book accessible transport", "in_progress", "tom", false, 60],
      ["Pack a blanket, water and a sunhat", "open", null, false, 60 * 24 * 13],
      ["Ask Dr Lin about the trip", "open", null, true, 60 * 24 * 13],
    ];
    for (const [i, [title, status, who, care, mins]] of quests.entries()) {
      await tx`insert into quests (wish_id, plan_id, title, status, needs_care_team, claimed_by_user_id, position, updated_at)
               values (${bondi}, ${plan!.id}, ${title}, ${status}, ${care}, ${who ? ids[who] : null}, ${i}, ${ago(mins)})`;
    }
    // Jok has two open quests and no plan text yet shown — "2 quests waiting for someone".
    const [jokPlan] = await tx<{ id: string }[]>`
      insert into plans (wish_id, text, based_on_mobility, needs_care_team, generated_at)
      values (${jok}, ${"Cook at home in the morning with Rose at the table telling the steps. Someone preps the rice and ginger the night before."},
              'short_walks_with_help', false, ${ago(60 * 25)})
      returning id`;
    for (const [i, title] of ["Find her mum’s recipe card", "Buy rice, ginger and pork"].entries()) {
      await tx`insert into quests (wish_id, plan_id, title, status, position) values (${jok}, ${jokPlan!.id}, ${title}, 'open', ${i})`;
    }

    // Two cards
    await tx`
      insert into cards (wish_id, circle_id, author_id, category, title, body, story, place, happened_on, created_at)
      values
        (${market}, ${circleId}, ${ids.may}, 'tastes', 'Sunday market dumplings',
         ${"Steam on the windows and a paper plate of pork dumplings. Rose ate three and told the stallholder they were nearly as good as hers."},
         ${"We went early before the crowds. She ate three!"}, 'Cabramatta', ${ago(60 * 24 * 26)}, ${ago(60 * 24 * 26)}),
        (null, ${circleId}, ${ids.krit}, 'nature', 'Jacarandas on our street',
         ${"The street turned purple overnight. Rose sat on the porch with tea and counted the trees she planted forty years ago."},
         ${"Purple everywhere this week."}, 'Home', ${ago(60 * 24 * 12)}, ${ago(60 * 24 * 12)})`;

    // Activity mirroring the design's feed
    const act = async (actor: Key, type: string, payload: Record<string, unknown>, minutesAgo: number) => {
      await tx`insert into activity (circle_id, actor_id, type, payload, created_at)
               values (${circleId}, ${ids[actor]}, ${type}, ${tx.json(payload as never)}, ${ago(minutesAgo)})`;
    };
    await act("ploy", "circle_created", {}, 60 * 24 * 40);
    await act("may", "card_created", { title: "Sunday market dumplings" }, 60 * 24 * 26);
    await act("ploy", "wish_added", { text: "Feel the sea breeze at Bondi" }, 60 * 24 * 14);
    await act("krit", "card_created", { title: "Jacarandas on our street" }, 60 * 24 * 12);
    await act("ploy", "wish_added", { text: "Cook her mum’s jok together" }, 60 * 26);
    await act("may", "photos_added", { count: 3, wish: "Sunday market" }, 120);
    await act("tom", "quest_claimed", { title: "Book accessible transport" }, 60);
    await act("krit", "quest_done", { title: "Find a beach with ramp access" }, 20);

    console.log(JSON.stringify({ level: "info", msg: "seeded", circleId, users: Object.keys(ids).map((k) => `${k}@${DEMO_DOMAIN}`) }));
  });
}

main()
  .catch((err: unknown) => {
    console.error(JSON.stringify({ level: "error", msg: "seed failed", error: String(err) }));
    process.exitCode = 1;
  })
  .finally(() => sql.end());
