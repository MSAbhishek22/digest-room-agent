/**
 * Digest Room loop — pure logic (no I/O, no DB).
 *
 * TypeScript port of the Flip the Switch Digest Room modules
 * (`digest_room/digest.py`, `digest_room/claims.py`), adapted to the
 * Agent-Native action model: actions own persistence (SQL), this module
 * owns the rules. Every function is pure and unit-tested.
 *
 * Rules (unchanged from the original):
 * - Morning digest lists actionable opportunities only, earliest deadline
 *   first; expired ones are left out, never posted as if claimable.
 * - One ✅ claims an opportunity for one user and creates one task card.
 *   Claiming twice returns the existing card — never a duplicate.
 * - An expired or unknown opportunity cannot be claimed.
 * - The agent never registers, submits, or pays; a task card is
 *   preparation only.
 * - End-of-day summary: claimed / still open / expired-unclaimed.
 * - Due-within-48h pings: claimed tasks with deadline in [now, now+48h],
 *   earliest first. Unclaimed items have no owner, so they are never pinged.
 */

export const AGENT_LABEL = "Digest Room agent";

export interface Opportunity {
  id: string;
  title: string;
  /** UTC ISO string, e.g. "2026-11-10T07:59:00.000Z". */
  deadline: string;
  prize: string;
  fitNote: string;
}

export interface TaskCard {
  id: string;
  opportunityId: string;
  owner: string;
  ownerName: string;
  title: string;
  /** UTC ISO string. */
  deadline: string;
  /** UTC ISO string. */
  claimedAt: string;
}

export type ClaimStatus = "claimed" | "already_claimed" | "expired" | "unknown";

export interface ClaimResult {
  status: ClaimStatus;
  card: TaskCard | null;
  message: string;
}

export const PING_WINDOW_MS = 48 * 60 * 60 * 1000;

export function parseIso(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`invalid ISO date: ${value}`);
  return d;
}

export function isExpired(opp: Opportunity, now: Date): boolean {
  return parseIso(opp.deadline).getTime() < now.getTime();
}

/** Actionable opportunities only, earliest deadline first. */
export function openOpportunities(opps: Opportunity[], now: Date): Opportunity[] {
  return opps
    .filter((o) => !isExpired(o, now))
    .sort((a, b) => {
      const d = parseIso(a.deadline).getTime() - parseIso(b.deadline).getTime();
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
}

export function formatDigest(opps: Opportunity[], now: Date): string {
  const dateLabel = now.toISOString().slice(0, 10);
  const header = `${AGENT_LABEL} — Morning digest — ${dateLabel}`;
  const open = openOpportunities(opps, now);
  if (open.length === 0) {
    return `${header}\nNo new opportunities in today's digest.`;
  }
  const lines = [
    header,
    "React ✅ on an item to claim it. The agent prepares; humans register, " +
      "submit, and pay — never the agent.",
    "",
  ];
  open.forEach((opp, i) => {
    lines.push(`${i + 1}. ${opp.title}`);
    lines.push(`   Deadline: ${opp.deadline} | Prize: ${opp.prize}`);
    lines.push(`   Fit: ${opp.fitNote}`);
  });
  lines.push("");
  lines.push(`${open.length} ${open.length === 1 ? "opportunity" : "opportunities"} open.`);
  return lines.join("\n");
}

export function formatClaimConfirmation(result: ClaimResult, now: Date): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  if (result.card === null) {
    return `${AGENT_LABEL} — ${stamp} — ${result.message}`;
  }
  if (result.status === "already_claimed") {
    return (
      `${AGENT_LABEL} — ${stamp} — already claimed by you: ` +
      `${result.card.title} (due ${result.card.deadline}). ` +
      "Your existing task card is unchanged."
    );
  }
  return (
    `${AGENT_LABEL} — ${stamp} — ✅ Claimed by ${result.card.ownerName}: ` +
    `${result.card.title} (due ${result.card.deadline}). Task card created.`
  );
}

/**
 * Pure claim transition. `cards` is the current card list; returns the
 * result plus the new card list (unchanged unless a fresh claim happened).
 * Actions persist the result in SQL inside a transaction; the UNIQUE
 * (owner, opportunityId) constraint is the durable backstop for this rule.
 */
export function applyClaim(
  opps: Opportunity[],
  cards: TaskCard[],
  userId: string,
  userName: string,
  opportunityId: string,
  now: Date,
): { result: ClaimResult; cards: TaskCard[] } {
  const opp = opps.find((o) => o.id === opportunityId);
  if (!opp) {
    return {
      result: {
        status: "unknown",
        card: null,
        message: `Unknown opportunity: ${opportunityId}. Nothing claimed.`,
      },
      cards,
    };
  }
  if (isExpired(opp, now)) {
    return {
      result: {
        status: "expired",
        card: null,
        message: `${opp.title} is past its deadline (${opp.deadline}). Nothing claimed.`,
      },
      cards,
    };
  }
  const existing = cards.find(
    (c) => c.owner === userId && c.opportunityId === opportunityId,
  );
  if (existing) {
    return {
      result: { status: "already_claimed", card: existing, message: "already claimed by you" },
      cards,
    };
  }
  const card: TaskCard = {
    id: `T-${opportunityId}-${userId}`,
    opportunityId,
    owner: userId,
    ownerName: userName,
    title: opp.title,
    deadline: opp.deadline,
    claimedAt: now.toISOString(),
  };
  return { result: { status: "claimed", card, message: "claimed" }, cards: [...cards, card] };
}

export function endOfDaySummary(
  opps: Opportunity[],
  cards: TaskCard[],
  now: Date,
): string {
  const dateLabel = now.toISOString().slice(0, 10);
  const header = `${AGENT_LABEL} — End-of-day summary — ${dateLabel}`;
  const claimedIds = new Set(cards.map((c) => c.opportunityId));
  const open = opps
    .filter((o) => !claimedIds.has(o.id) && !isExpired(o, now))
    .sort((a, b) => parseIso(a.deadline).getTime() - parseIso(b.deadline).getTime());
  const expired = opps
    .filter((o) => !claimedIds.has(o.id) && isExpired(o, now))
    .sort((a, b) => parseIso(a.deadline).getTime() - parseIso(b.deadline).getTime());
  if (cards.length === 0 && open.length === 0 && expired.length === 0) {
    return `${header}\nNothing to report today.`;
  }
  const lines = [header, "", "Claimed:"];
  if (cards.length > 0) {
    for (const card of cards) {
      lines.push(`  ✅ ${card.title} — ${card.ownerName} (due ${card.deadline})`);
    }
  } else {
    lines.push("  No claims yet today — react ✅ on a digest item to claim it.");
  }
  lines.push("", "Still open:");
  if (open.length > 0) {
    for (const opp of open) lines.push(`  ○ ${opp.title} (due ${opp.deadline})`);
  } else {
    lines.push("  Nothing still open.");
  }
  lines.push("", "Expired unclaimed:");
  if (expired.length > 0) {
    for (const opp of expired) lines.push(`  ✕ ${opp.title} (was due ${opp.deadline})`);
  } else {
    lines.push("  None.");
  }
  return lines.join("\n");
}

/** Claimed tasks due in [now, now+48h], earliest deadline first. */
export function dueWithin48h(cards: TaskCard[], now: Date): TaskCard[] {
  const end = now.getTime() + PING_WINDOW_MS;
  return cards
    .filter((c) => {
      const t = parseIso(c.deadline).getTime();
      return now.getTime() <= t && t <= end;
    })
    .sort((a, b) => parseIso(a.deadline).getTime() - parseIso(b.deadline).getTime());
}

/**
 * DEMO seed opportunities. Deadlines are fixed real hackathon deadlines
 * (all labelled DEMO in the UI); the expired one exercises the expired
 * branch. `now` is only used to keep the list stable, never to invent
 * deadlines.
 */
export function seedOpportunities(): Opportunity[] {
  return [
    {
      id: "opp-builder-io",
      title: "Builder.io Agent-Native Hackathon",
      deadline: "2026-11-10T07:59:00.000Z",
      prize: "$10,000 cash (Grand $5,000)",
      fitNote: "This entry — the room itself is the demo. Clips recording + form.",
    },
    {
      id: "opp-near",
      title: "NEAR Hackathon 2026 — Guarded Wallet",
      deadline: "2026-11-14T23:59:00.000Z",
      prize: "$250,000 in NEAR (Grand $55,000)",
      fitNote: "Guarded wallet built; needs payout address + X post + form.",
    },
    {
      id: "opp-future-health",
      title: "Future Health — Preventive Signal Front Door",
      deadline: "2026-11-20T18:29:00.000Z",
      prize: "$105,000 (1st $50,000)",
      fitNote: "Registered, statement #4; prototype sprint 15–19 Nov.",
    },
    {
      id: "opp-flip-switch",
      title: "Flip the Switch — Digest Room (original)",
      deadline: "2026-11-07T18:29:00.000Z",
      prize: "$10,000 pool (Best Business Workflow $2,000)",
      fitNote: "SUBMITTED 5 Nov — expired in this demo on purpose.",
    },
  ];
}

/** Demo teammates shown in the claim picker. Fictional names for the demo. */
export const DEMO_TEAMMATES = [
  { id: "teammate-aayushi", name: "Aayushi" },
  { id: "teammate-rohan", name: "Rohan" },
  { id: "teammate-meera", name: "Meera" },
] as const;
