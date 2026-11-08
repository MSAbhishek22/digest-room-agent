import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { claimInTransaction } from "../server/digest-room/store.js";
import { DEMO_TEAMMATES, formatClaimConfirmation } from "../server/digest-room/logic.js";

/**
 * claim-opportunity — react ✅ to claim an opportunity.
 *
 * One claim, one task card, forever: claiming twice returns the existing
 * card ("already_claimed"), never a duplicate. Expired or unknown
 * opportunities cannot be claimed. The agent never claims on a human's
 * behalf — the click IS the human's ✅.
 *
 * `userId` is a demo teammate id (see DEMO_TEAMMATES) so a judge can run
 * the whole loop solo; in a real team this would be the signed-in user.
 */
const teammateIds = DEMO_TEAMMATES.map((t) => t.id) as unknown as [
  string,
  ...string[],
];

export default defineAction({
  description:
    "Claim an opportunity with a ✅ reaction: creates one task card for the claiming teammate. Idempotent — claiming twice returns the existing card. Expired or unknown opportunities cannot be claimed.",
  mcpTool: true,
  schema: z.object({
    opportunityId: z.string().min(1).describe("Opportunity id from the digest, e.g. opp-builder-io"),
    userId: z
      .enum(teammateIds)
      .describe("Demo teammate claiming: teammate-aayushi, teammate-rohan, or teammate-meera"),
  }),
  run: async ({ opportunityId, userId }) => {
    const teammate = DEMO_TEAMMATES.find((t) => t.id === userId);
    if (!teammate) {
      return { status: "unknown", card: null, message: `Unknown teammate: ${userId}.` };
    }
    const now = new Date();
    const result = await claimInTransaction(userId, teammate.name, opportunityId, now);
    const confirmation = formatClaimConfirmation(
      { status: result.status as "claimed" | "already_claimed" | "expired" | "unknown", card: result.card, message: result.message },
      now,
    );
    return { ...result, confirmation };
  },
});
