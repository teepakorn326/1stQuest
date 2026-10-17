import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so `next build` doesn't need runtime secrets. Empty strings count as unset. */
export function env(): Env {
  if (!cached) {
    const raw = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
    );
    cached = schema.parse(raw);
  }
  return cached;
}

export function appUrl(): string {
  return env().APP_URL.replace(/\/$/, "");
}
