// Tests for the new longitudinal logic, and for the boundaries it must hold.
//
// Two kinds of assertion here. The first kind checks the feature works. The
// second kind checks the product does NOT do things it deliberately refuses —
// no compliance judgement, no inferred match dates for legacy records, no
// scoring. Those are the ones worth keeping.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  dateLabel, followUpOf, formatMatchDate, hasCommitment,
  orderedForDisplay, previousCommitment,
} from "../app/history.mjs";

const withCommitment = (will_change, extra = {}) => ({
  name: "A Coach", opposition: "Someone",
  action: { keep_doing: "kept", will_change, how_when: "at training" },
  ...extra,
});

// ── previous commitment ─────────────────────────────────────────────────────

test("the previous commitment is the most recent one, returned verbatim", () => {
  const reviews = [
    withCommitment("Slow down my half-time talk"),
    withCommitment("Stop reacting to the first mistake"),
  ];
  const prev = previousCommitment(reviews);
  assert.equal(prev.text, "Slow down my half-time talk");
});

test("a reflection without a commitment is skipped, not treated as empty", () => {
  const reviews = [
    { action: { keep_doing: "x", will_change: "   ", how_when: "" } },
    { action: { keep_doing: "x", will_change: "", how_when: "" } },
    withCommitment("Stop reacting to the first mistake"),
  ];
  assert.equal(previousCommitment(reviews).text, "Stop reacting to the first mistake");
});

test("no history, or no commitment anywhere, yields null rather than a blank prompt", () => {
  assert.equal(previousCommitment([]), null);
  assert.equal(previousCommitment(null), null);
  assert.equal(previousCommitment(undefined), null);
  assert.equal(previousCommitment([{ action: { will_change: "" } }, {}]), null);
});

test("the antecedent is carried as TEXT, never as a position", () => {
  const prev = previousCommitment([withCommitment("Composure on the sideline")]);
  assert.equal(typeof prev.text, "string");
  for (const key of ["index", "position", "id", "ref"]) {
    assert.equal(prev[key], undefined, `the antecedent is identified by ${key}`);
  }
});

test("hasCommitment is whitespace-honest", () => {
  assert.equal(hasCommitment(withCommitment("x")), true);
  assert.equal(hasCommitment(withCommitment("   ")), false);
  assert.equal(hasCommitment({}), false);
  assert.equal(hasCommitment(null), false);
  assert.equal(hasCommitment({ action: { will_change: 7 } }), false);
});

// ── dates: the legacy honesty rule ──────────────────────────────────────────

test("a coach-stated match date is reported as stated", () => {
  const d = dateLabel({ match_date: "2026-09-06", date: "10 Sep 2026" });
  assert.equal(d.stated, true);
  assert.equal(d.text, "6 Sep 2026");
});

test("A LEGACY RECORD IS NEVER PRESENTED AS A KNOWN MATCH DATE", () => {
  // Legacy records carry only the submission-time display string. It is not a
  // match date and must not be dressed as one.
  const d = dateLabel({ date: "12 May 2026" });
  assert.equal(d.stated, false, "a submission date was reported as a stated match date");
  assert.equal(d.text, "12 May 2026", "the stored value was rewritten");
});

test("nothing infers, back-fills or rewrites a legacy date", () => {
  const legacy = { date: "12 May 2026", action: { will_change: "x" } };
  const before = JSON.stringify(legacy);
  dateLabel(legacy);
  previousCommitment([legacy]);
  orderedForDisplay([legacy]);
  assert.equal(JSON.stringify(legacy), before, "a stored record was mutated");
});

test("an empty or malformed match date falls back rather than guessing", () => {
  assert.equal(dateLabel({ match_date: "   ", date: "1 Jun 2026" }).stated, false);
  assert.equal(dateLabel({ match_date: "not-a-date" }).text, "not-a-date");
  assert.equal(dateLabel({}).text, "");
  assert.equal(dateLabel(null).text, "");
});

test("formatMatchDate handles the input type=date shape and passes anything else through", () => {
  assert.equal(formatMatchDate("2026-01-01"), "1 Jan 2026");
  assert.equal(formatMatchDate("2026-12-31"), "31 Dec 2026");
  assert.equal(formatMatchDate("2026-13-01"), "2026-13-01");
  assert.equal(formatMatchDate(""), "");
  assert.equal(formatMatchDate(null), "");
});

// ── ordering ────────────────────────────────────────────────────────────────

test("stated match dates order newest first; legacy records are a separate group in saved order", () => {
  const a = { match_date: "2026-09-01", tag: "a" };
  const b = { match_date: "2026-09-08", tag: "b" };
  const legacy1 = { date: "1 May 2026", tag: "L1" };
  const legacy2 = { date: "2 May 2026", tag: "L2" };
  const out = orderedForDisplay([a, legacy1, b, legacy2]).map((r) => r.tag);
  // Stated records first, newest match first. Legacy records after, untouched
  // in their saved order, because they cannot be placed on a match timeline.
  assert.deepEqual(out, ["b", "a", "L1", "L2"]);
});

test("ordering is deterministic — the same input always gives the same output", () => {
  const input = [
    { match_date: "2026-09-01", tag: "a" }, { date: "1 May", tag: "L1" },
    { match_date: "2026-09-08", tag: "b" }, { date: "2 May", tag: "L2" },
    { match_date: "2026-09-01", tag: "a2" },
  ];
  const first = orderedForDisplay(input).map((r) => r.tag);
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(orderedForDisplay(input).map((r) => r.tag), first);
  }
  // Equal match dates keep their saved order rather than swapping.
  assert.equal(first.indexOf("a") < first.indexOf("a2"), true);
});

test("ordering is total and never throws on mixed or malformed input", () => {
  for (const input of [[], null, undefined, [{}, null, { match_date: "x" }]]) {
    assert.equal(Array.isArray(orderedForDisplay(input)), true);
  }
});

// ── follow-up: recorded, never judged ───────────────────────────────────────

test("a follow-up preserves the coach's own words and the exact antecedent", () => {
  const f = followUpOf({
    follow_up: {
      previous_will_change: "Stop reacting to the first mistake",
      response: "Did it for 40 minutes then lost it when the sub went on",
    },
  });
  assert.equal(f.antecedent, "Stop reacting to the first mistake");
  assert.equal(f.response, "Did it for 40 minutes then lost it when the sub went on");
});

test("ABSENCE IS ABSENCE — no follow-up is null, never a miss", () => {
  for (const review of [{}, null, { follow_up: null }, { follow_up: {} },
    { follow_up: { previous_will_change: "  ", response: "  " } }]) {
    assert.equal(followUpOf(review), null);
  }
});

test("the module emits no outcome, score, status or judgement of any kind", () => {
  const f = followUpOf({
    follow_up: { previous_will_change: "a", response: "b" },
  });
  assert.deepEqual(Object.keys(f).sort(), ["antecedent", "response"]);
  for (const banned of ["outcome", "met", "kept", "missed", "status", "score",
    "compliance", "success", "streak", "rate"]) {
    assert.equal(f[banned], undefined, `the follow-up carries a judgement: ${banned}`);
  }
});

test("PROHIBITED: the module contains no scoring, counting or theme logic", () => {
  const src = readFileSync(fileURLToPath(new URL("../app/history.mjs", import.meta.url)), "utf8")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const re of [/\bscore\b/i, /\bstreak\b/i, /\bcompliance\b/i, /\baverage\b/i,
    /\btrend\b/i, /\btheme\b/i, /\brank\b/i, /\bcompare\b/i, /\.filter\([^)]*met/i]) {
    assert.ok(!re.test(src), `history.mjs contains prohibited logic: ${re}`);
  }
  // Pure: no storage, no network, no clock.
  for (const t of ["localStorage", "fetch(", "Date.now", "new Date", "crypto", "document"]) {
    assert.ok(!src.includes(t), `history.mjs is not pure: ${t}`);
  }
});
