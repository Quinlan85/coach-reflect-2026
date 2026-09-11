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

// ── the iPhone date field ──────────────────────────────────────────────────
//
// THREE ROUNDS, AND THE HISTORY MATTERS MORE THAN THE RULES.
//
//   1. min-width: 0 on the control. Shipped. Still broken on iPhone: it only
//      addressed the control WANTING to be wide, not what happens if it is.
//   2. Containment on the wrapper. The page stopped breaking — measured, column
//      and page overflow went from 508px/501px to 0 — but an iPhone screenshot
//      showed the control was still oversized and the clip was simply cutting
//      it, leaving a squared-off right edge next to two properly rounded ones.
//   3. This one. Stop trying to make the native control the right size, and
//      stop letting it paint the visible edge at all.
//
// `.date-shell` is an ordinary div carrying the background, border and corner
// radius. Ordinary divs always fit. The control inside is transparent and
// borderless, so however wide iOS decides it should be, there is no visible
// edge left to clip. Verified in a browser: with the control forced to 900px,
// the field still matches the text inputs on left edge, right edge, radius,
// border and background, with no column or page overflow.
//
// These are source assertions because the defect is WebKit-only and cannot be
// reproduced by a test runner. That is exactly the trap that let round one look
// verified when it was not, so the tests pin the MECHANISM, not a measurement.

test("THE VISIBLE BOX BELONGS TO THE SHELL, NOT THE NATIVE CONTROL", () => {
  const shell = CODE.match(/\.date-shell\s*\{([^}]*)\}/);
  assert.ok(shell, "the .date-shell rule is gone — the control paints its own edge again");
  const css = shell[1];
  for (const [what, re] of [
    ["background", /background:\s*#2E2E2E/],
    ["border", /border:\s*1\.5px solid #3D3D3D/],
    ["corner radius", /border-radius:\s*10px/],
    // overflow:hidden on a rounded box clips along the curve, so an oversized
    // control is hidden without squaring the corner off.
    ["overflow clipping", /overflow:\s*hidden/],
    ["width containment", /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/],
  ]) {
    assert.ok(re.test(css), `the shell lost its ${what}`);
  }
});

test("THE NATIVE CONTROL PAINTS NO EDGE OF ITS OWN", () => {
  // This is the whole fix. If the control draws a background, a border or a
  // corner, then its width becomes visible again and can be clipped again.
  const css = CODE.match(/input\[type="date"\]\s*\{([^}]*)\}/)[1];
  for (const [what, re] of [
    ["transparent background", /background:\s*transparent/],
    ["no border", /border:\s*0/],
    ["no corner radius", /border-radius:\s*0/],
  ]) {
    assert.ok(re.test(css), `the date control regained a visible ${what.replace(/^(no|transparent) /, "")}`);
  }
  // And no inline style may put them back.
  const tag = CODE.match(/<input type="date"[\s\S]*?\/>/)[0];
  for (const banned of ["background", "border", "borderRadius"]) {
    assert.ok(!tag.includes(banned), `the date input has an inline ${banned} again`);
  }
});

test("focus still shows, on the element that now owns the border", () => {
  assert.ok(/\.date-shell:focus-within\s*\{[^}]*border-color:\s*#F0A500/.test(CODE),
    "focus no longer highlights the date field");
  // The old inline handlers coloured a border that no longer exists.
  const tag = CODE.match(/<input type="date"[\s\S]*?\/>/)[0];
  assert.ok(!/onFocus|onBlur/.test(tag), "dead inline focus handlers are back on the date input");
});

test("the control is still contained, and still fills the shell", () => {
  const css = CODE.match(/input\[type="date"\]\s*\{([^}]*)\}/)[1];
  for (const [prop, re] of [
    ["display: block", /display:\s*block/],
    ["width: 100%", /width:\s*100%/],
    ["max-width: 100%", /max-width:\s*100%/],
    ["min-width: 0", /min-width:\s*0/],
    ["box-sizing: border-box", /box-sizing:\s*border-box/],
  ]) {
    assert.ok(re.test(css), `the date control lost ${prop}`);
  }
  assert.ok(/\.date-field\s*\{[^}]*grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/.test(CODE),
    "the outer field lost its width containment");
  assert.ok(/::-webkit-datetime-edit[^{]*\{[^}]*min-width:\s*0/.test(CODE),
    "the shadow-tree constraint is gone");
});

test("the field still LOOKS like its two siblings", () => {
  // The Name and Opposition inputs define the house style; the shell must match
  // them, or the date field reads as a different kind of control.
  const sibling = CODE.match(/placeholder=\{f\.placeholder\}[\s\S]*?\/>/)[0];
  const shell = CODE.match(/\.date-shell\s*\{([^}]*)\}/)[1];
  assert.ok(sibling.includes('background:"#2E2E2E"') && /background:\s*#2E2E2E/.test(shell),
    "the date field's background drifted from the text inputs");
  assert.ok(sibling.includes('border:"1.5px solid #3D3D3D"') && /border:\s*1\.5px solid #3D3D3D/.test(shell),
    "the date field's border drifted from the text inputs");
  assert.ok(sibling.includes("borderRadius:10") && /border-radius:\s*10px/.test(shell),
    "the date field's corner radius drifted from the text inputs");
  // The value reads left-aligned like every other field, not centred.
  assert.ok(/::-webkit-date-and-time-value\s*\{[^}]*text-align:\s*left/.test(CODE),
    "the date value is no longer left-aligned to match the other fields");
});

test("THE NATIVE iOS PICKER IS PRESERVED", () => {
  assert.ok(!/appearance:\s*none/i.test(CODE),
    "-webkit-appearance:none strips the native iOS date picker");
});

test("the fix is presentation only — behaviour and stored values untouched", () => {
  assert.ok(/match_date:\s*info\.match_date/.test(CODE), "match_date storage changed");
  assert.ok(/submitted_at:\s*Date\.now\(\)/.test(CODE), "submitted_at storage changed");
  assert.ok(/match_date:\s*todayISO\(\)/.test(CODE), "the today pre-fill changed");
  assert.ok(/type="date"/.test(CODE), "the field is no longer a native date input");
  assert.ok(/onChange=\{e=>setInfo\(p=>\(\{\.\.\.p,match_date:e\.target\.value\}\)\)\}/.test(CODE),
    "the date field is no longer editable or no longer bound to info.match_date");
});
