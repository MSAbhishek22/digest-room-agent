/**
 * Tests for the Digest Room loop rules (server/digest-room/logic.ts).
 *
 * Port of the original Python test intent (digest_room/tests.py in the
 * Flip the Switch project), run here with vitest in the Linux sandbox.
 */
import { describe, expect, it } from "vitest";

import {
  applyClaim,
  dueWithin48h,
  endOfDaySummary,
  formatDigest,
  formatClaimConfirmation,
  isExpired,
  openOpportunities,
  seedOpportunities,
  type Opportunity,
  type TaskCard,
} from "./logic.js";

const NOW = new Date("2026-11-08T03:30:00.000Z");

function opp(id: string, deadline: string, title = id): Opportunity {
  return { id, title, deadline, prize: "$1", fitNote: "fit" };
}

describe("digest", () => {
  it("empty input yields the empty-digest message, never a fake item", () => {
    expect(formatDigest([], NOW)).toContain("No new opportunities");
    expect(formatDigest([], NOW)).not.toContain("1.");
  });

  it("leaves expired opportunities out of the digest", () => {
    const text = formatDigest(
      [
        opp("a", "2026-11-09T00:00:00.000Z", "Open one"),
        opp("b", "2026-11-07T00:00:00.000Z", "Expired one"),
      ],
      NOW,
    );
    expect(text).toContain("Open one");
    expect(text).not.toContain("Expired one");
    expect(text).toContain("1 opportunity open.");
  });

  it("sorts earliest deadline first", () => {
    const text = formatDigest(
      [
        opp("late", "2026-11-12T00:00:00.000Z", "Late"),
        opp("early", "2026-11-09T00:00:00.000Z", "Early"),
      ],
      NOW,
    );
    expect(text.indexOf("Early")).toBeLessThan(text.indexOf("Late"));
  });

  it("a deadline exactly at now is still actionable", () => {
    expect(isExpired(opp("x", "2026-11-08T03:30:00.000Z"), NOW)).toBe(false);
    expect(openOpportunities([opp("x", "2026-11-08T03:30:00.000Z")], NOW)).toHaveLength(1);
  });

  it("a deadline one second before now is expired", () => {
    expect(isExpired(opp("x", "2026-11-08T03:29:59.000Z"), NOW)).toBe(true);
  });
});

describe("claim", () => {
  const opps = [opp("o1", "2026-11-10T00:00:00.000Z", "First"), opp("o2", "2026-11-07T00:00:00.000Z", "Gone")];

  it("a fresh claim creates exactly one card", () => {
    const { result, cards } = applyClaim(opps, [], "u1", "Aayushi", "o1", NOW);
    expect(result.status).toBe("claimed");
    expect(result.card).not.toBeNull();
    expect(result.card?.owner).toBe("u1");
    expect(result.card?.ownerName).toBe("Aayushi");
    expect(cards).toHaveLength(1);
  });

  it("claiming twice by the same user returns the existing card, never a second", () => {
    const first = applyClaim(opps, [], "u1", "Aayushi", "o1", NOW);
    const second = applyClaim(opps, first.cards, "u1", "Aayushi", "o1", NOW);
    expect(second.result.status).toBe("already_claimed");
    expect(second.result.card?.id).toBe(first.result.card?.id);
    expect(second.cards).toHaveLength(1);
    expect(formatClaimConfirmation(second.result, NOW)).toContain("already claimed by you");
  });

  it("a different user claiming the same opportunity gets their own card", () => {
    const first = applyClaim(opps, [], "u1", "Aayushi", "o1", NOW);
    const second = applyClaim(opps, first.cards, "u2", "Rohan", "o1", NOW);
    expect(second.result.status).toBe("claimed");
    expect(second.cards).toHaveLength(2);
  });

  it("an expired opportunity cannot be claimed", () => {
    const { result, cards } = applyClaim(opps, [], "u1", "Aayushi", "o2", NOW);
    expect(result.status).toBe("expired");
    expect(result.card).toBeNull();
    expect(cards).toHaveLength(0);
  });

  it("an unknown id cannot be claimed", () => {
    const { result, cards } = applyClaim(opps, [], "u1", "Aayushi", "nope", NOW);
    expect(result.status).toBe("unknown");
    expect(result.card).toBeNull();
    expect(cards).toHaveLength(0);
  });

  it("the confirmation names the owner and the deadline", () => {
    const { result } = applyClaim(opps, [], "u1", "Aayushi", "o1", NOW);
    const text = formatClaimConfirmation(result, NOW);
    expect(text).toContain("✅ Claimed by Aayushi");
    expect(text).toContain("2026-11-10T00:00:00.000Z");
  });
});

describe("end-of-day summary", () => {
  it("reports claimed / still open / expired-unclaimed", () => {
    const opps = [
      opp("o1", "2026-11-10T00:00:00.000Z", "Claimed one"),
      opp("o2", "2026-11-12T00:00:00.000Z", "Open one"),
      opp("o3", "2026-11-07T00:00:00.000Z", "Expired one"),
    ];
    const { cards } = applyClaim(opps, [], "u1", "Aayushi", "o1", NOW);
    const text = endOfDaySummary(opps, cards, NOW);
    expect(text).toContain("Claimed:");
    expect(text).toContain("✅ Claimed one — Aayushi");
    expect(text).toContain("Still open:");
    expect(text).toContain("○ Open one");
    expect(text).toContain("Expired unclaimed:");
    expect(text).toContain("✕ Expired one");
  });

  it("an empty day says so honestly", () => {
    expect(endOfDaySummary([], [], NOW)).toContain("Nothing to report today.");
  });
});

describe("due within 48h", () => {
  const card = (id: string, deadline: string): TaskCard => ({
    id,
    opportunityId: id,
    owner: "u1",
    ownerName: "Aayushi",
    title: id,
    deadline,
    claimedAt: NOW.toISOString(),
  });

  it("includes tasks due exactly at now and exactly at now+48h", () => {
    const cards = [
      card("a", "2026-11-08T03:30:00.000Z"),
      card("b", "2026-11-10T03:30:00.000Z"),
      card("c", "2026-11-10T03:30:01.000Z"),
      card("d", "2026-11-08T03:29:59.000Z"),
    ];
    const due = dueWithin48h(cards, NOW);
    expect(due.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("returns earliest deadline first", () => {
    const cards = [card("late", "2026-11-09T12:00:00.000Z"), card("early", "2026-11-08T12:00:00.000Z")];
    expect(dueWithin48h(cards, NOW).map((c) => c.id)).toEqual(["early", "late"]);
  });
});

describe("demo seeds", () => {
  it("ships four DEMO opportunities with valid ISO deadlines, one expired", () => {
    const seeds = seedOpportunities();
    expect(seeds).toHaveLength(4);
    for (const s of seeds) {
      expect(Number.isNaN(new Date(s.deadline).getTime())).toBe(false);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prize.length).toBeGreaterThan(0);
    }
    const expired = seeds.filter((s) => isExpired(s, NOW));
    expect(expired).toHaveLength(1);
    expect(expired[0]?.id).toBe("opp-flip-switch");
    const open = openOpportunities(seeds, NOW);
    expect(open).toHaveLength(3);
    expect(open[0]?.id).toBe("opp-builder-io");
  });
});
