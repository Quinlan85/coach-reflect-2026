// Source-level guarantees about the screens themselves.
//
// history.mjs can be perfectly honest and the UI can still betray it: a red
// number, a claim that installing the app keeps reflections safe, a follow-up
// tied to a list position. These tests read app/page.jsx and pin the things
// that must not come back. They assert on CODE, so JSX comments are stripped
// first — otherwise a comment saying "no scores" would satisfy a test looking
// for the absence of scores.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const strip = (src) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const PAGE = read("../app/page.jsx");
const CODE = strip(PAGE);

// ── the traffic lights stay gone ────────────────────────────────────────────

test("NO RED/AMBER GRADING anywhere in the app", () => {
  // #E74C3C survives only as the Action Plan section accent and the PIN error
  // state. It must never again be selected by a rating or a completion count.
  for (const re of [
    /(?:ratings?\[[^\]]+\]|\bv\b|\bvalue\b|\btotal\b)\s*>=?\s*\d+\s*\?\s*"#[0-9A-Fa-f]{6}"/,
    /\?\s*"#F4C542"/,
  ]) {
    assert.ok(!re.test(CODE), `a value-driven colour verdict is back: ${re}`);
  }
  assert.ok(!CODE.includes("#F4C542"), "the amber grading colour is back");

  // #E74C3C may be chosen conditionally in exactly one place: the PIN error
  // state, which is a boolean about a wrong keypress, not a verdict on a coach.
  // Anywhere else it must be a fixed section accent with no condition at all.
  for (const m of CODE.matchAll(/([^;{}\n]{0,80}?)\?[^;\n]{0,80}"#E74C3C"/g)) {
    assert.ok(/pinError\s*$/.test(m[1].trim()),
      `#E74C3C is chosen by a condition other than pinError: ${m[0].trim()}`);
  }
});

test("every rating is shown — Emotional Control is not truncated away", () => {
  assert.ok(!/RATINGS\.slice\(/.test(CODE), "RATINGS is being sliced for display");
  assert.equal(
    (CODE.match(/Emotional Control/g) || []).length, 1,
    "Emotional Control is not defined exactly once",
  );
});

// ── the disclosure ──────────────────────────────────────────────────────────

test("the disclosure states local-only storage and irreversible loss", () => {
  for (const phrase of [
    "saved on this phone only",
    "CQ Perform keeps no copy",
    "they are gone",
    "not what you wrote",
  ]) {
    assert.ok(PAGE.includes(phrase), `the disclosure no longer says: ${phrase}`);
  }
});

test("NOTHING CLAIMS INSTALLATION MAKES STORAGE PERMANENT", () => {
  // Verified against current iOS behaviour: Safari's ITP deletes script-writable
  // storage after seven days without interaction, and the Home Screen exemption
  // is a browser behaviour, not a guarantee. Never promise otherwise.
  const copy = (PAGE + read("../app/manifest.ts")).toLowerCase();
  for (const re of [
    /permanent(ly)? (saved|stored|kept)/, /never (be )?(lost|deleted)/,
    /always (be )?(saved|kept|there)/, /storage is safe/, /backed up/,
    /(add|install).{0,60}(so|to keep|and) (your |they |them )?(answers|reflections|data).{0,40}(safe|kept|permanent)/,
  ]) {
    assert.ok(!re.test(copy), `a permanence claim was introduced: ${re}`);
  }
});

// ── the two dates stay two dates ────────────────────────────────────────────

test("a new reflection stores the match date and the submit time separately", () => {
  assert.ok(/match_date:\s*info\.match_date/.test(CODE), "match_date is not stored");
  assert.ok(/submitted_at:\s*Date\.now\(\)/.test(CODE), "submitted_at is not stored");
  assert.ok(/\bdate,/.test(CODE), "the legacy `date` field is no longer written");
});

test("legacy records are labelled, not rewritten", () => {
  assert.ok(CODE.includes("logged ${d.text}"), "the `logged` label for legacy records is gone");
  // No back-fill: nothing writes match_date onto a stored review.
  assert.ok(!/rev\.match_date\s*=/.test(CODE), "a stored review is being mutated");
  assert.ok(!/match_date:\s*(rev|review)\.date/.test(CODE), "a submit date is being copied into match_date");
});

test("the coach can state a date other than today", () => {
  assert.ok(/type="date"/.test(CODE), "the match date field is not a date input");
  assert.ok(/onChange=\{e=>setInfo\(p=>\(\{\.\.\.p,match_date:e\.target\.value\}\)\)\}/.test(CODE),
    "the match date field is not editable");
});

// ── the follow-up ───────────────────────────────────────────────────────────

test("the follow-up stores the antecedent as text, never as a position", () => {
  assert.ok(/previous_will_change:\s*prevCommitment\.text/.test(CODE),
    "the antecedent is not stored as text");
  assert.ok(!/previous(_will_change)?:\s*\w*(index|idx|\[0\])/i.test(CODE),
    "the antecedent is identified by position");
});

test("A FOLLOW-UP NEVER BLOCKS A COACH and is never demanded", () => {
  const gate = CODE.match(/const canProceed[\s\S]*?\n  \};/)[0];
  assert.ok(!/followUp/.test(gate), "an unanswered follow-up blocks progress");
  assert.ok(PAGE.includes("Optional."), "the follow-up is not marked optional");
});

test("an unanswered follow-up is stored as nothing, not as a miss", () => {
  assert.ok(/if \(prevCommitment && followUp\.trim\(\)\) \{/.test(CODE),
    "an empty follow-up is being persisted");
  for (const banned of ["missed", "not_done", "kept:", "compliance", "streak", "adherence"]) {
    assert.ok(!CODE.toLowerCase().includes(banned), `a compliance judgement appeared: ${banned}`);
  }
});

// ── deletion ────────────────────────────────────────────────────────────────

test("DELETION IS BY IDENTITY — reordering the list cannot delete the wrong one", () => {
  // The displayed order is no longer the stored order, so an index would delete
  // whatever happened to sit at that position in storage.
  assert.ok(/onDelete\(rev\)/.test(CODE), "delete is not passing the review itself");
  // The open panel is closed first: after a delete the list shifts, and the
  // position that was expanded would otherwise reveal a different reflection.
  assert.ok(/setExpanded\(null\); onDelete\(rev\)/.test(CODE),
    "deleting leaves a stale card expanded");
  assert.ok(/reviews\.filter\(\(r\) => r !== target\)/.test(CODE),
    "delete is not filtering by object identity");
});

// ── the iOS date-input overflow fix ─────────────────────────────────────────
//
// This one cannot be proven by a test runner or by Chromium: the defect is a
// WebKit-only layout behaviour. So the test pins the FIX ITSELF, and the
// reasoning is recorded here so nobody deletes the rule as dead weight.
//
// WebKit gives input[type=date] `display: inline-flex`; every other engine uses
// inline-block. That hands the control an automatic minimum size equal to the
// intrinsic width of its internal date editor. `min-width` wins over both
// `width` and `max-width`, so `width: 100%` was being clamped UPWARDS and the
// field overflowed the content column to the right on iPhone.

test("THE iOS DATE OVERFLOW FIX IS STILL SHIPPED", () => {
  // Asserted against CODE, not PAGE: the comment next to the input quotes this
  // very rule, and matching that comment would let the real rule be deleted
  // while the test stayed green.
  const rule = /input\[type="date"\]\s*\{[^}]*min-width:\s*0[^}]*\}/;
  assert.ok(rule.test(CODE), "the min-width:0 rule for input[type=date] is gone — iPhone overflow returns");
});

test("the date field is still width-constrained to its container", () => {
  const style = CODE.match(/input\[type="date"\]\s*\{([^}]*)\}/)[1];
  assert.ok(/max-width:\s*100%/.test(style), "max-width:100% guard removed");
  // Scope to the date input's OWN style object — up to its self-closing tag —
  // so a neighbouring element's width:100% cannot satisfy this.
  const dateTag = CODE.match(/<input type="date"[\s\S]*?\/>/)[0];
  assert.ok(/width:\s*"100%"/.test(dateTag),
    "the date input no longer fills the content width");
});

test("the fix is CSS only — date behaviour and stored values are untouched", () => {
  // The overflow fix must not have reached into what the field means or stores.
  assert.ok(/match_date:\s*info\.match_date/.test(CODE), "match_date storage changed");
  assert.ok(/submitted_at:\s*Date\.now\(\)/.test(CODE), "submitted_at storage changed");
  assert.ok(/match_date:\s*todayISO\(\)/.test(CODE), "the today pre-fill changed");
  assert.ok(/a\.match_date|info\.match_date/.test(CODE), "the field is no longer bound to info.match_date");
  // No appearance override crept in: that would restyle the native iOS picker,
  // which is a redesign, not a width fix.
  assert.ok(!/appearance:\s*none/i.test(CODE),
    "-webkit-appearance:none would restyle the native picker — out of scope for a width fix");
});
