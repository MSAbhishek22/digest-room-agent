import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Digest Room Agent — SQL schema (Drizzle over PostgreSQL; PGlite locally).
 *
 * Times are UTC ISO text so string order equals time order. Ids are text
 * (crypto.randomUUID(), or the deterministic `T-<opp>-<user>` card ids from
 * the claim rule — stable ids make the idempotency rule visible in the DB).
 */

export const opportunities = pgTable("digest_opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  /** UTC ISO deadline, e.g. "2026-11-10T07:59:00.000Z". */
  deadline: text("deadline").notNull(),
  prize: text("prize").notNull(),
  fitNote: text("fit_note").notNull(),
  /** "demo" for seed data; "user" for anything added later. */
  source: text("source").notNull().default("demo"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const taskCards = pgTable(
  "digest_task_cards",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id").notNull(),
    /** The claiming user (demo teammate id, e.g. "teammate-aayushi"). */
    owner: text("owner").notNull(),
    ownerName: text("owner_name").notNull(),
    title: text("title").notNull(),
    /** UTC ISO deadline, copied from the opportunity at claim time. */
    deadline: text("deadline").notNull(),
    claimedAt: text("claimed_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // One claim per (user, opportunity) — the durable backstop for the
    // idempotency rule. A duplicate insert fails instead of creating a
    // second card.
    uniqueIndex("digest_task_cards_owner_opportunity_unique").on(
      table.owner,
      table.opportunityId,
    ),
  ],
);

export const roomMessages = pgTable("digest_room_messages", {
  id: text("id").primaryKey(),
  /** "digest" | "confirmation" | "eod" | "ping" | "system". */
  kind: text("kind").notNull(),
  /** The exact agent message text shown in the room. */
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const agentRuns = pgTable("digest_agent_runs", {
  id: text("id").primaryKey(),
  /** "morning_digest" | "eod_summary" | "seed_demo". */
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});
