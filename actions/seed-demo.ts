import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { insertMessage, insertRun, replaceSeed } from "../server/digest-room/store.js";
import { seedOpportunities } from "../server/digest-room/logic.js";

/**
 * seed-demo — reset the room and seed the labelled DEMO opportunities.
 *
 * Clears task cards, messages, and agent runs, then inserts the four
 * DEMO opportunities (three open, one expired on purpose). Every seed
 * item is labelled DEMO in the UI; nothing here is presented as real.
 */
export default defineAction({
  description:
    "Reset the Digest Room and seed the labelled DEMO opportunities (three open, one expired on purpose). Clears task cards, messages, and agent runs.",
  mcpTool: true,
  schema: z.object({}),
  run: async () => {
    const opps = seedOpportunities();
    await replaceSeed(opps);
    await insertMessage(
      "system",
      "Digest Room agent — DEMO data seeded. Four opportunities: three open, one expired on purpose. Pick a teammate and react ✅ to claim.",
    );
    await insertRun("seed_demo", "seeded", `${opps.length} DEMO opportunities`);
    return {
      seeded: opps.length,
      opportunities: opps.map((o) => ({ id: o.id, title: o.title, deadline: o.deadline })),
    };
  },
});
