// DB-backed tests run only against TEST_DATABASE_URL (local PGlite), never the app's DATABASE_URL.
import { config } from "dotenv";

config({ quiet: true });
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DB_POOL_MAX = "1";
} else {
  delete process.env.DATABASE_URL;
}
process.env.AI_PROVIDER = "mock";
