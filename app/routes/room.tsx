/**
 * Digest Room — the Morning Desk.
 *
 * One column, one scroll: masthead → 3D depth pipeline → agent digest
 * sheet → opportunities with ✅ claim → task-card rail → EOD summary +
 * 48h pings → activity log. Every control calls an Agent-Native action;
 * the agent's chat tools are the same actions, so the UI and the agent
 * can never disagree about the room.
 *
 * Design: "The Morning Desk" — paper #FAF6EE, ink #1C1A17, vermilion
 * #C2410C for agent actions only. Serif display, sans data, mono stamps.
 */
import { useState } from "react";

import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";

import "../styles/room.css";

type Filter = "all" | "open" | "claimed" | "due" | "expired";

interface RoomOpportunity {
  id: string;
  title: string;
  deadline: string;
  prize: string;
  fitNote: string;
  status: "open" | "claimed" | "expired";
  claimedBy: string | null;
}

interface RoomTaskCard {
  id: string;
  opportunityId: string;
  owner: string;
  ownerName: string;
  title: string;
  deadline: string;
  claimedAt: string;
}

interface RoomMessage {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
}

interface RoomData {
  now: string;
  opportunities: RoomOpportunity[];
  taskCards: RoomTaskCard[];
  messages: RoomMessage[];
  counts: { open: number; claimed: number; dueWithin48h: number; expiredUnclaimed: number };
  dueSoon: RoomTaskCard[];
  eodPreview: string;
}

const TEAMMATES = [
  { id: "teammate-aayushi", name: "Aayushi" },
  { id: "teammate-rohan", name: "Rohan" },
  { id: "teammate-meera", name: "Meera" },
] as const;

const STAGES: { key: Filter; label: string; hint: string }[] = [
  { key: "open", label: "Open", hint: "awaiting a ✅" },
  { key: "claimed", label: "Claimed", hint: "task cards filed" },
  { key: "due", label: "Due 48h", hint: "owners get pinged" },
  { key: "expired", label: "Expired", hint: "unclaimed, gone" },
];

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function DigestRoom() {
  const [filter, setFilter] = useState<Filter>("all");
  const [teammateId, setTeammateId] = useState<string>(TEAMMATES[0].id);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const roomQuery = useActionQuery("list-room", {}, { method: "GET" });
  const seedMutation = useActionMutation("seed-demo");
  const digestMutation = useActionMutation("post-digest");
  const eodMutation = useActionMutation("post-eod-summary");
  const claimMutation = useActionMutation("claim-opportunity");

  const room = roomQuery.data as RoomData | undefined;
  const today = new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const latestByKind = (kind: string): RoomMessage | undefined => {
    const matches = room?.messages.filter((m) => m.kind === kind) ?? [];
    return matches[matches.length - 1];
  };

  const dueSoonIds = new Set((room?.dueSoon ?? []).map((c) => c.id));

  const visibleOpps = (room?.opportunities ?? []).filter((o) => {
    if (filter === "all") return true;
    if (filter === "open") return o.status === "open";
    if (filter === "claimed") return o.status === "claimed";
    if (filter === "expired") return o.status === "expired";
    if (filter === "due") {
      const card = room?.taskCards.find((c) => c.opportunityId === o.id);
      return card !== undefined && dueSoonIds.has(card.id);
    }
    return true;
  });

  async function handleClaim(opportunityId: string) {
    setNotice(null);
    try {
      const result = await claimMutation.mutateAsync({
        opportunityId,
        userId: teammateId,
      } as never);
      const confirmation = (result as { confirmation?: string })?.confirmation;
      setNotice(confirmation ?? "Claim recorded.");
    } catch (error) {
      setNotice(
        `Claim failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async function handleSeed() {
    setNotice(null);
    setConfirmReset(false);
    try {
      await seedMutation.mutateAsync({} as never);
      setNotice("DEMO data seeded — four opportunities, three open, one expired on purpose.");
    } catch (error) {
      setNotice(`Seed failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  async function handleDigest() {
    setNotice(null);
    try {
      await digestMutation.mutateAsync({} as never);
      setNotice("Morning digest posted by the agent.");
    } catch (error) {
      setNotice(`Digest failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  async function handleEod() {
    setNotice(null);
    try {
      await eodMutation.mutateAsync({} as never);
      setNotice("End-of-day summary posted by the agent.");
    } catch (error) {
      setNotice(`EOD failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const busy =
    seedMutation.isPending || digestMutation.isPending || eodMutation.isPending || claimMutation.isPending;

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-6 sm:px-6" style={{ background: "#FAF6EE", color: "#1C1A17" }}>
      {/* Masthead */}
      <header className="border-b-2 pb-4" style={{ borderColor: "#1C1A17" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[32px] leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            The Morning Desk
          </h1>
          <span
            className="rounded-full px-2.5 py-1 text-[12px] font-bold tracking-wide"
            style={{ background: "#C2410C", color: "#FAF6EE" }}
          >
            DEMO DATA
          </span>
        </div>
        <p className="mt-1 text-[14px]" style={{ color: "#5C564C" }}>
          {today} · Digest Room — the agent posts the digest, you react ✅, the agent
          confirms and files the card. The agent prepares; humans register, submit, and pay.
        </p>
      </header>

      {/* Agent actions */}
      <section aria-label="Agent actions" className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDigest}
          disabled={busy}
          className="min-h-[44px] rounded-md px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "#C2410C" }}
        >
          {digestMutation.isPending ? "Posting…" : "Post morning digest"}
        </button>
        <button
          type="button"
          onClick={handleEod}
          disabled={busy}
          className="min-h-[44px] rounded-md px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "#C2410C" }}
        >
          {eodMutation.isPending ? "Posting…" : "Post EOD summary"}
        </button>
        <button
          type="button"
          onClick={() => (confirmReset ? void handleSeed() : setConfirmReset(true))}
          disabled={busy}
          className="min-h-[44px] rounded-md border px-4 py-2 text-[14px] font-semibold disabled:opacity-50"
          style={{ borderColor: "#1C1A17", background: "transparent" }}
        >
          {seedMutation.isPending
            ? "Seeding…"
            : confirmReset
              ? "Click again to confirm reset"
              : "Reset demo data"}
        </button>
      </section>

      {/* Live notice */}
      <div aria-live="polite" className="mt-3 min-h-[20px] text-[13px]" style={{ color: "#5C564C" }}>
        {notice}
      </div>

      {roomQuery.isPending && (
        <p className="mt-6 text-[14px]" style={{ color: "#5C564C" }}>
          Loading the room…
        </p>
      )}

      {roomQuery.isError && (
        <section className="mt-6 rounded-md border p-4" style={{ borderColor: "#C2410C" }}>
          <h2 className="text-[16px] font-semibold">The room could not load.</h2>
          <p className="mt-1 text-[14px]" style={{ color: "#5C564C" }}>
            {roomQuery.error instanceof Error ? roomQuery.error.message : "Unknown error."}{" "}
            If this is a fresh install, the database migration runs on first start — try
            reloading once.
          </p>
          <button
            type="button"
            onClick={() => void roomQuery.refetch()}
            className="mt-3 min-h-[44px] rounded-md px-4 py-2 text-[14px] font-semibold text-white"
            style={{ background: "#C2410C" }}
          >
            Reload the room
          </button>
        </section>
      )}

      {room && room.opportunities.length === 0 && (
        <section className="mt-6 rounded-md border bg-white p-5">
          <h2 className="text-[18px] font-semibold" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            The room is empty.
          </h2>
          <p className="mt-1 text-[14px]" style={{ color: "#5C564C" }}>
            No opportunities yet. Seed the labelled DEMO set to run the loop.
          </p>
          <button
            type="button"
            onClick={handleSeed}
            disabled={busy}
            className="mt-3 min-h-[44px] rounded-md px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: "#C2410C" }}
          >
            {seedMutation.isPending ? "Seeding…" : "Seed demo data"}
          </button>
        </section>
      )}

      {room && room.opportunities.length > 0 && (
        <>
          {/* 3D depth pipeline */}
          <section aria-label="Pipeline" className="mt-6">
            <div className="digest-pipeline grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STAGES.map((stage) => {
                const count =
                  stage.key === "open"
                    ? room.counts.open
                    : stage.key === "claimed"
                      ? room.counts.claimed
                      : stage.key === "due"
                        ? room.counts.dueWithin48h
                        : room.counts.expiredUnclaimed;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    aria-pressed={filter === stage.key}
                    onClick={() => setFilter(filter === stage.key ? "all" : stage.key)}
                    className="digest-pipeline-stage min-h-[96px] rounded-md border bg-white p-3 text-left"
                    style={{ borderColor: "#E3DCCB" }}
                  >
                    <span className="block text-[28px] font-bold leading-none">{count}</span>
                    <span className="mt-1 block text-[14px] font-semibold">{stage.label}</span>
                    <span className="block text-[12px]" style={{ color: "#5C564C" }}>
                      {stage.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px]" style={{ color: "#5C564C" }}>
              {filter === "all"
                ? "Select a stage to filter the lists below."
                : `Filtering: ${STAGES.find((s) => s.key === filter)?.label} — select again to show all.`}
            </p>
          </section>

          {/* Digest sheet */}
          {latestByKind("digest") && (
            <section aria-label="Morning digest" className="mt-6 rounded-md border-l-4 bg-white p-5" style={{ borderColor: "#E3DCCB", borderLeftColor: "#C2410C" }}>
              <h2 className="text-[20px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Morning digest
              </h2>
              <p className="mt-1 text-[12px]" style={{ color: "#5C564C", fontFamily: "ui-monospace, Menlo, monospace" }}>
                Digest Room agent · {formatStamp(latestByKind("digest")!.createdAt)} IST
              </p>
              <pre className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ fontFamily: "inherit" }}>
                {latestByKind("digest")!.body}
              </pre>
            </section>
          )}

          {/* Claim picker */}
          <section aria-label="Claim as" className="mt-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "#5C564C" }}>
              Claim as (demo teammates)
            </h2>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Demo teammate">
              {TEAMMATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={teammateId === t.id}
                  onClick={() => setTeammateId(t.id)}
                  className="min-h-[44px] rounded-full border px-4 py-2 text-[14px] font-semibold"
                  style={{
                    borderColor: teammateId === t.id ? "#1E7A4C" : "#E3DCCB",
                    background: teammateId === t.id ? "#EAF5EE" : "#FFFFFF",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </section>

          {/* Opportunities */}
          <section aria-label="Opportunities" className="mt-4">
            <h2 className="text-[20px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Opportunities
            </h2>
            {visibleOpps.length === 0 && (
              <p className="mt-2 text-[14px]" style={{ color: "#5C564C" }}>
                Nothing in this stage right now.
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {visibleOpps.map((o) => {
                const card = room.taskCards.find((c) => c.opportunityId === o.id);
                const isDue = card !== undefined && dueSoonIds.has(card.id);
                return (
                  <li key={o.id} className="rounded-md border bg-white p-4" style={{ borderColor: "#E3DCCB" }}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-[16px] font-semibold">{o.title}</h3>
                      {o.status === "claimed" && (
                        <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: "#EAF5EE", color: "#1E7A4C" }}>
                          ✅ Claimed by {o.claimedBy}
                        </span>
                      )}
                      {o.status === "expired" && (
                        <span className="rounded-full px-2 py-0.5 text-[12px] font-bold line-through" style={{ background: "#F0EDE6", color: "#8A8578" }}>
                          ✕ Expired
                        </span>
                      )}
                      {o.status === "open" && isDue && (
                        <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: "#FBF3DC", color: "#9A6B00" }}>
                          Due within 48h
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px]" style={{ color: "#5C564C" }}>
                      Deadline:{" "}
                      <time dateTime={o.deadline}>{formatDeadline(o.deadline)} IST</time>
                      {" · "}Prize: {o.prize}
                    </p>
                    <p className="mt-1 text-[14px]">Fit: {o.fitNote}</p>
                    {o.status === "open" && (
                      <button
                        type="button"
                        onClick={() => void handleClaim(o.id)}
                        disabled={busy}
                        className="mt-3 min-h-[44px] rounded-md px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                        style={{ background: "#1E7A4C" }}
                      >
                        {claimMutation.isPending ? "Claiming…" : `✅ Claim as ${TEAMMATES.find((t) => t.id === teammateId)?.name}`}
                      </button>
                    )}
                    {o.status === "claimed" && card && (
                      <p className="mt-3 text-[13px]" style={{ color: "#5C564C" }}>
                        Task card {card.id} · claimed{" "}
                        <time dateTime={card.claimedAt}>{formatStamp(card.claimedAt)} IST</time>
                        {isDue ? " · due within 48h — the agent will ping the owner." : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Task-card rail */}
          <section aria-label="Task cards" className="mt-8">
            <h2 className="text-[20px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Task cards
            </h2>
            {room.taskCards.length === 0 ? (
              <p className="mt-2 text-[14px]" style={{ color: "#5C564C" }}>
                No claims yet today — react ✅ on an opportunity to claim it.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {room.taskCards.map((c) => {
                  const isDue = dueSoonIds.has(c.id);
                  return (
                    <li key={c.id} className="rounded-md border bg-white p-4" style={{ borderColor: "#E3DCCB" }}>
                      <h3 className="text-[15px] font-semibold">{c.title}</h3>
                      <p className="mt-1 text-[13px]" style={{ color: "#5C564C" }}>
                        Owner: {c.ownerName} · Due:{" "}
                        <time dateTime={c.deadline}>{formatDeadline(c.deadline)} IST</time>
                      </p>
                      <p className="mt-1 text-[12px]" style={{ color: "#5C564C", fontFamily: "ui-monospace, Menlo, monospace" }}>
                        {c.id}
                      </p>
                      {isDue && (
                        <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: "#FBF3DC", color: "#9A6B00" }}>
                          ⏰ Due within 48h
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* EOD summary + pings */}
          {(latestByKind("eod") || latestByKind("ping")) && (
            <section aria-label="End-of-day summary" className="mt-8 rounded-md border-l-4 bg-white p-5" style={{ borderColor: "#E3DCCB", borderLeftColor: "#C2410C" }}>
              <h2 className="text-[20px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                End-of-day summary
              </h2>
              {latestByKind("eod") && (
                <pre className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ fontFamily: "inherit" }}>
                  {latestByKind("eod")!.body}
                </pre>
              )}
              {latestByKind("ping") && (
                <>
                  <h3 className="mt-4 text-[15px] font-semibold">48h pings</h3>
                  <pre className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ fontFamily: "inherit" }}>
                    {latestByKind("ping")!.body}
                  </pre>
                </>
              )}
            </section>
          )}

          {/* Activity log */}
          <section aria-label="Activity log" className="mt-8">
            <h2 className="text-[20px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Activity log
            </h2>
            {room.messages.length === 0 ? (
              <p className="mt-2 text-[14px]" style={{ color: "#5C564C" }}>
                Nothing posted yet. Post the morning digest to start the day.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {[...room.messages].reverse().map((m) => (
                  <li key={m.id} className="rounded-md border bg-white p-3" style={{ borderColor: "#E3DCCB" }}>
                    <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: m.kind === "digest" || m.kind === "eod" || m.kind === "ping" ? "#C2410C" : "#5C564C" }}>
                      {m.kind} · <time dateTime={m.createdAt}>{formatStamp(m.createdAt)} IST</time>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {/* Honesty footer */}
      <footer className="mt-10 border-t pt-4 text-[12px]" style={{ borderColor: "#E3DCCB", color: "#5C564C" }}>
        DEMO data: the four opportunities and the three teammates are labelled
        demo items so a judge can run the whole loop solo. The claim rule is
        real — one ✅, one card, forever; expired items can never be claimed.
        The agent prepares; humans register, submit, and pay.
      </footer>
    </main>
  );
}
