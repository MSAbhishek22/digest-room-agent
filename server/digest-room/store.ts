/**
 * SQL store for the Digest Room — thin persistence layer over the
 * framework's `getDb()`. Actions call these helpers; the claim rule lives
 * in `logic.ts` and is enforced here inside a transaction with a parent
 * row lock, plus the UNIQUE (owner, opportunityId) constraint as backstop.
 */
import { asc, eq } from "drizzle-orm";

import { getDb } from "../db/index.js";
import { agentRuns, opportunities, roomMessages, taskCards } from "../db/schema.js";
import { applyClaim, formatClaimConfirmation } from "./logic.js";
import type { Opportunity, TaskCard } from "./logic.js";

export async function loadOpportunities(): Promise<Opportunity[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(opportunities)
    .orderBy(asc(opportunities.deadline), asc(opportunities.id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    deadline: r.deadline,
    prize: r.prize,
    fitNote: r.fitNote,
  }));
}

export async function loadTaskCards(): Promise<TaskCard[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(taskCards)
    .orderBy(asc(taskCards.claimedAt), asc(taskCards.id));
  return rows.map((r) => ({
    id: r.id,
    opportunityId: r.opportunityId,
    owner: r.owner,
    ownerName: r.ownerName,
    title: r.title,
    deadline: r.deadline,
    claimedAt: r.claimedAt,
  }));
}

export async function loadMessages(limit = 50): Promise<
  { id: string; kind: string; body: string; createdAt: string }[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(roomMessages)
    .orderBy(asc(roomMessages.createdAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, createdAt: r.createdAt }));
}

export async function insertMessage(kind: string, body: string): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(roomMessages).values({ id, kind, body });
  return id;
}

export async function insertRun(kind: string, status: string, detail: string): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(agentRuns).values({ id, kind, status, detail });
  return id;
}

export async function replaceSeed(opps: Opportunity[]): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(taskCards);
    await tx.delete(roomMessages);
    await tx.delete(agentRuns);
    await tx.delete(opportunities);
    for (const o of opps) {
      await tx.insert(opportunities).values({
        id: o.id,
        title: o.title,
        deadline: o.deadline,
        prize: o.prize,
        fitNote: o.fitNote,
        source: "demo",
      });
    }
  });
}

/**
 * Claim inside one transaction: lock the opportunity row, re-read the
 * cards, apply the pure rule, and insert the card + confirmation message
 * only on a fresh claim. Returns the claim result and, on a fresh claim,
 * the new card.
 */
export async function claimInTransaction(
  userId: string,
  userName: string,
  opportunityId: string,
  now: Date,
): Promise<{ status: string; card: TaskCard | null; message: string }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [oppRow] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .for("update");
    const opp: Opportunity | undefined = oppRow
      ? {
          id: oppRow.id,
          title: oppRow.title,
          deadline: oppRow.deadline,
          prize: oppRow.prize,
          fitNote: oppRow.fitNote,
        }
      : undefined;
    const cardRows = await tx
      .select()
      .from(taskCards)
      .orderBy(asc(taskCards.claimedAt), asc(taskCards.id));
    const cards: TaskCard[] = cardRows.map((r) => ({
      id: r.id,
      opportunityId: r.opportunityId,
      owner: r.owner,
      ownerName: r.ownerName,
      title: r.title,
      deadline: r.deadline,
      claimedAt: r.claimedAt,
    }));
    const { result } = applyClaim(
      opp ? [opp] : [],
      cards,
      userId,
      userName,
      opportunityId,
      now,
    );
    if (result.status === "claimed" && result.card) {
      const c = result.card;
      await tx.insert(taskCards).values({
        id: c.id,
        opportunityId: c.opportunityId,
        owner: c.owner,
        ownerName: c.ownerName,
        title: c.title,
        deadline: c.deadline,
        claimedAt: c.claimedAt,
      });
      await tx.insert(roomMessages).values({
        id: crypto.randomUUID(),
        kind: "confirmation",
        body: formatClaimConfirmation(result, now),
      });
    }
    return { status: result.status, card: result.card, message: result.message };
  });
}
