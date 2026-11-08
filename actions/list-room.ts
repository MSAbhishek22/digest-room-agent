import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import {
  loadMessages,
  loadOpportunities,
  loadTaskCards,
} from "../server/digest-room/store.js";
import { dueWithin48h, endOfDaySummary, openOpportunities } from "../server/digest-room/logic.js";

/**
 * list-room — read the whole room in one call (GET).
 *
 * The UI's single source of truth: opportunities with their claim state,
 * task cards, the agent's message log, and the pipeline counts. The agent
 * calls this to see the room before it acts.
 */
export default defineAction({
  description:
    "Read the Digest Room: opportunities with claim state, task cards, agent message log, and pipeline counts (open / claimed / due within 48h / expired).",
  mcpTool: true,
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const now = new Date();
    const opps = await loadOpportunities();
    const cards = await loadTaskCards();
    const messages = await loadMessages(50);
    const claimedIds = new Set(cards.map((c) => c.opportunityId));
    const open = openOpportunities(opps, now).filter((o) => !claimedIds.has(o.id));
    const expiredUnclaimed = opps.filter(
      (o) => !claimedIds.has(o.id) && new Date(o.deadline).getTime() < now.getTime(),
    );
    const dueSoon = dueWithin48h(cards, now);
    return {
      now: now.toISOString(),
      opportunities: opps.map((o) => ({
        ...o,
        status: claimedIds.has(o.id)
          ? "claimed"
          : new Date(o.deadline).getTime() < now.getTime()
            ? "expired"
            : "open",
        claimedBy: cards.find((c) => c.opportunityId === o.id)?.ownerName ?? null,
      })),
      taskCards: cards,
      messages,
      counts: {
        open: open.length,
        claimed: cards.length,
        dueWithin48h: dueSoon.length,
        expiredUnclaimed: expiredUnclaimed.length,
      },
      dueSoon,
      eodPreview: endOfDaySummary(opps, cards, now),
    };
  },
});
