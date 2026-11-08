import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

import { loadOpportunities, loadTaskCards } from "../server/digest-room/store.js";
import { dueWithin48h, openOpportunities } from "../server/digest-room/logic.js";

export default defineAction({
  description:
    "Read the app's current navigation state. When the user is in the Digest Room, also returns the room's live state (open / claimed / due within 48h / expired counts). Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;

    const path =
      navigation && typeof navigation === "object" && "path" in navigation
        ? String((navigation as { path: unknown }).path)
        : "";
    if (path === "/room" || path.startsWith("/room/")) {
      const now = new Date();
      const opps = await loadOpportunities();
      const cards = await loadTaskCards();
      const claimedIds = new Set(cards.map((c) => c.opportunityId));
      screen.room = {
        view: "room",
        open: openOpportunities(opps, now).length,
        claimed: cards.length,
        dueWithin48h: dueWithin48h(cards, now).length,
        expiredUnclaimed: opps.filter(
          (o) => !claimedIds.has(o.id) && new Date(o.deadline).getTime() < now.getTime(),
        ).length,
      };
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
