import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { insertMessage, insertRun, loadOpportunities, loadTaskCards } from "../server/digest-room/store.js";
import { dueWithin48h, endOfDaySummary } from "../server/digest-room/logic.js";

/**
 * post-eod-summary — the agent posts the end-of-day summary.
 *
 * Claimed / still open / expired-unclaimed, plus a ping message naming
 * the owners of claimed tasks due within 48 hours. Writes both messages
 * to the room log and records the agent run.
 */
export default defineAction({
  description:
    "Post the end-of-day summary in the Digest Room: claimed / still open / expired, plus a ping to owners of tasks due within 48 hours.",
  mcpTool: true,
  schema: z.object({}),
  run: async () => {
    const now = new Date();
    const opps = await loadOpportunities();
    const cards = await loadTaskCards();
    const summary = endOfDaySummary(opps, cards, now);
    const dueSoon = dueWithin48h(cards, now);
    const summaryId = await insertMessage("eod", summary);
    let pingId: string | null = null;
    let ping: string | null = null;
    if (dueSoon.length > 0) {
      const lines = dueSoon.map(
        (c) => `  ⏰ ${c.ownerName} — ${c.title} (due ${c.deadline})`,
      );
      ping = [
        `Digest Room agent — 48h ping — ${now.toISOString().slice(0, 10)}`,
        "These claimed tasks are due within 48 hours:",
        ...lines,
      ].join("\n");
      pingId = await insertMessage("ping", ping);
    }
    await insertRun(
      "eod_summary",
      "posted",
      `${cards.length} claimed, ${dueSoon.length} due within 48h`,
    );
    return { summaryId, pingId, dueSoonCount: dueSoon.length, summary, ping };
  },
});
