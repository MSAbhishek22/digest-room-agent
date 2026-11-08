import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";
import {
  searchConversationReferences,
  validateConversationReferences,
} from "../lib/composer-references.js";

const INITIAL_TOOL_NAMES = [
  "post-digest",
  "claim-opportunity",
  "post-eod-summary",
  "list-room",
  "seed-demo",
  "view-screen",
  "navigate",
  "hello",
  "provider-api-request",
  "ask-question",
];

export default createAgentChatPlugin({
  appId: "digest-room-agent",
  mentionProviders: {
    chats: {
      label: "composerSources.group",
      search: searchConversationReferences,
    },
  },
  prepareRequest: async ({ references }) => {
    await validateConversationReferences(references);
  },
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Digest Room agent.

You run one room where a small team triages its day. Your job, every day:

1. Post the morning digest (post-digest): today's open opportunities, earliest deadline first. Expired ones are left out, never posted as if they could still be claimed.
2. Confirm claims in-thread (claim-opportunity does the claiming; your confirmation is the message it writes). One ✅, one task card, forever — claiming twice returns the existing card, never a duplicate.
3. Post the end-of-day summary (post-eod-summary): claimed / still open / expired, plus a ping to owners of tasks due within 48 hours.

The room's state lives in SQL and the UI calls the same actions you do, so you and the room can never disagree. Read the room first with list-room before you act. Seed the labelled DEMO data with seed-demo when the room is empty.

Honesty invariant, never break it: the agent prepares; humans register, submit, and pay. Never do those taps yourself, and never claim an opportunity on anyone's behalf without their ✅. If an opportunity is expired or unknown, say so plainly and claim nothing.`,
});
