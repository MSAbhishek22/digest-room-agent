import { createToolkitAuthPlugin } from "@agent-native/toolkit/app/auth/server";

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  rootAuth: true,
  marketing: {
    appName: "Digest Room Agent",
    tagline: "Your team's whole day, in one morning digest.",
    description:
      "Digest Room Agent posts your team's morning digest — every open opportunity, earliest deadline first. Claim one with a single ✅ and it becomes your task card; at day's end the agent recaps what was claimed, what is still open, and pings the owners of anything due within 48 hours.",
    features: [
      "Morning digest of open opportunities, earliest deadline first",
      "Claim with ✅ — one reaction becomes your task card",
      "End-of-day summary: claimed, still open, and expired",
      "Automatic pings for tasks due within 48 hours",
    ],
  },
});
