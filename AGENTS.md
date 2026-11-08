# Chat — Agent Guide

Chat is the minimal chat-first agent-native app. `/` redirects to shared sign-in, then `/home`, the editable Get started page. Chat lives at `/chat`; new chats start there. Actions carry capabilities; screens exist only for durable workflows.

## Digest Room Agent (domain app)

The room where a small team triages its day. `/room` is the home path.
Design: "The Morning Desk" — paper `#FAF6EE`, ink `#1C1A17`, vermilion
`#C2410C` for agent actions only; Georgia serif display, sans data, mono
stamps. Full design constitution: `../design/DESIGN_CONSTITUTION.md`.

### Loop

1. Agent posts the morning digest (open opportunities, earliest first).
2. A teammate reacts ✅ → one claim, one task card, forever. Claiming
   twice returns the existing card. Expired/unknown cannot be claimed.
3. Agent confirms in-thread; the card appears in the task-card rail.
4. Agent posts the EOD summary (claimed / still open / expired) + pings
   owners of tasks due within 48h.
5. Honesty invariant: the agent prepares; humans register, submit, and
   pay. Never claim on a human's behalf without their ✅.

### Actions

| Action | Args | What it does |
|---|---|---|
| `seed-demo` | — | Reset the room; seed 4 labelled DEMO opportunities (3 open, 1 expired on purpose). |
| `post-digest` | — | Post the morning digest to the room message log. |
| `claim-opportunity` | `opportunityId`, `userId` (teammate-aayushi \| teammate-rohan \| teammate-meera) | ✅ claim; idempotent; writes the confirmation message. |
| `list-room` | — (GET) | Whole room: opportunities + claim state, cards, messages, counts, due-soon list, EOD preview. |
| `post-eod-summary` | — | Post the EOD summary + 48h ping message. |

Pure rules live in `server/digest-room/logic.ts` (tested: 16 tests).
SQL schema in `server/db/schema.ts`; migrations in `server/plugins/db.ts`
(v1 `digest-room-v1`). Store helpers in `server/digest-room/store.ts`
(claim runs in one transaction with a parent-row lock; the UNIQUE
(owner, opportunityId) constraint is the durable idempotency backstop).

### Routes and state

- `/room` — the room UI (`app/routes/room.tsx` + `room.css`). Uses
  `useActionQuery("list-room")` and `useActionMutation` for the five
  actions; no custom REST endpoints.
- Sidebar has a "Digest Room" link before the chat threads.
- Navigation view `"room"` (`app/hooks/use-navigation-state.ts`) so
  `navigate --view room` works and `view-screen` reports the room's
  live counts when the user is on `/room`.
- Agent chat (`server/plugins/agent-chat.ts`): domain system prompt +
  the five digest actions first in `INITIAL_TOOL_NAMES`.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- `navigation` describes the view and selected ids. Chat is `chat` at `/chat` and `/chat/<threadId>`; the Get started page is `home` at `/home`; `/` opens shared sign-in/signup.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Building a domain app

Choose the primary workflow and route before editing. Add a domain route under `app/routes/` and set `app.homePath` in `server/plugins/agent-native-email-branding.ts` with `defineAppConfig`. The default Get started page lives at `/home`, and Chat stays at `/chat`; edit `app/routes/home.tsx` when replacing that page with a domain-specific home. Add a static link in `app/components/layout/Sidebar.tsx` before `ChatThreadsSection`; `Header.tsx` uses `APP_TITLE` elsewhere. Shared sidebar and AgentInspector remain.

Use `adding-a-feature` for functional parity and `frontend-design` for a user-facing screen. Keep feature guidance here; do not rewrite `README.md` or `DESIGN.md`. After all edits, run one typecheck, one doctor check, and one browser smoke of the primary workflow, including overlap rejection, cancellation freeing the slot, and authenticated landing. Skip production build and extra test suites.

Before building common workspace or agent UI, read `agent-native-toolkit`; for supported customization, read `customizing-agent-native`.

- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.
