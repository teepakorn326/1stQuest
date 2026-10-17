// Integration test: needs a Postgres at DATABASE_URL with migrations applied (e.g. `pnpm db:local && pnpm migrate`).
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { hashToken, randomToken } from "@/lib/auth/tokens";

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("magic links", async () => {
  const { consumeMagicLink, insertMagicLink } = await import("@/lib/db/queries/magicLinks");
  const raw = postgres(url!, { max: 1, prepare: false });
  const email = `test-${randomToken(6)}@example.test`;

  afterAll(async () => {
    await raw`delete from magic_links where email = ${email}`;
    await raw.end();
  });

  it("can be used exactly once", async () => {
    const token = randomToken();
    await insertMagicLink({ tokenHash: hashToken(token), email, nextPath: "/join/x", ttlMinutes: 15 });
    expect(await consumeMagicLink(hashToken(token))).toEqual({ email, next_path: "/join/x" });
    expect(await consumeMagicLink(hashToken(token))).toBeNull();
  });

  it("does not work after it expires", async () => {
    const token = randomToken();
    await insertMagicLink({ tokenHash: hashToken(token), email, nextPath: null, ttlMinutes: 15 });
    await raw`update magic_links set expires_at = now() - interval '1 second' where token_hash = ${hashToken(token)}`;
    expect(await consumeMagicLink(hashToken(token))).toBeNull();
  });

  it("stores only a hash of the token", async () => {
    const token = randomToken();
    await insertMagicLink({ tokenHash: hashToken(token), email, nextPath: null, ttlMinutes: 15 });
    const rows = await raw`select 1 from magic_links where token_hash = ${token}`;
    expect(rows).toHaveLength(0);
  });

  it("rejects unknown tokens", async () => {
    expect(await consumeMagicLink(hashToken(randomToken()))).toBeNull();
  });
});
