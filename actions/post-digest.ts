import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { insertMessage, insertRun, loadOpportunities, loadTaskCards } from "../server/digest-room/store.js";
import { formatDigest } from "../server/digest-room/logic.js";

/**
 * post-digest — the agent posts the morning digest.
 *
 * Reads the open opportunities from SQL, formats the digest (actionable
 * items only, earliest deadline first), writes it to the room message log
 * so the UI, the agent, and the audit trail all see the same text, and
 * records the agent run. Idempotent per day is NOT enforced — the agent
 * posts once each morning; re-posting is visible in the log, never silent.
 */
export default defineAction({
  description:
    "Post the morning digest in the Digest Room: today's open opportunities, earliest deadline first, expired ones left out.",
  mcpTool: true,
  schema: z.object({}),
  run: async () => {
    const now = new Date();
    const opps = await loadOpportunities();
    const cards = await loadTaskCards();
    const digest = formatDigest(opps, now);
    const claimedIds = new Set(cards.map((c) => c.opportunityId));
    const openCount = opps.filter(
      (o) => !claimedIds.has(o.id) && new Date(o.deadline).getTime() >= now.getTime(),
    ).length;
    const messageId = await insertMessage("digest", digest);
    await insertRun(
      "morning_digest",
      "posted",
      `${openCount} ${openCount === 1 ? "opportunity" : "opportunities"} open`,
    );
    return { messageId, openCount, digest };
  },
});
