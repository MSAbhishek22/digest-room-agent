import { runMigrations } from "@agent-native/core/db";

/**
 * Digest Room Agent — additive migrations (v1).
 *
 * Never renumber or edit an applied entry; append a new one. The `name`
 * slug is tracked independently of the version number, so each entry
 * applies exactly once per database.
 */
export default runMigrations(
  [
    {
      version: 1,
      name: "digest-room-v1",
      sql: `CREATE TABLE IF NOT EXISTS digest_opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL,
  prize TEXT NOT NULL,
  fit_note TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'demo',
  created_at TEXT NOT NULL DEFAULT (now())
);
CREATE TABLE IF NOT EXISTS digest_task_cards (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT (now())
);
CREATE UNIQUE INDEX IF NOT EXISTS digest_task_cards_owner_opportunity_unique
  ON digest_task_cards (owner, opportunity_id);
CREATE TABLE IF NOT EXISTS digest_room_messages (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now())
);
CREATE TABLE IF NOT EXISTS digest_agent_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now())
);`,
    },
  ],
  { table: "digest_room_migrations" },
);
