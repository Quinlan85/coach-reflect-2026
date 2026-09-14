// The workshop-readiness upgrade, pinned.
//
// Five changes went in: bigger rating targets, 16px Action Plan fields, a
// submit control that survives the iOS keyboard, a completion screen that ends
// on the coach's own decision, and the CQ family typography. Everything else
// was explicitly out of scope, so roughly half of this file exists to prove
// that the things NOT in that list did not move.
//
// Assertions read CODE with comments stripped first — otherwise a comment
// saying "no telemetry" would satisfy a test looking for the absence of it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const strip = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const PAGE = read("../app/page.jsx");
const CODE = strip(PAGE);
const CSS = read("../app/globals.css");
const LAYOUT = read("../app/layout.tsx");

// ── 1. RATINGS ──────────────────────────────────────────────────────────────

test("1. every rating target is at least 44px, in two rows of five", () => {
  assert.match(CODE, /gridTemplateColumns: "repeat\(5, minmax\(0, 1fr\)\)"/,
    "the rating scale is not laid out as five columns");
  assert.match(CODE, /height: 44/, "the rating buttons are not 44px tall");
  // The old single row of ten is what made them 29px wide. It must not return.
  assert.ok(!/display: "flex", gap: 5/.test(CODE), "the ten-across row is back");
});

test("1b. the scale itself is untouched — ten values, same anchors", () => {
  assert.match(CODE, /\[1,2,3,4,5,6,7,8,9,10\]\.map/, "the 1-10 scale changed");
  assert.match(PAGE, /RATING_LABELS = \{ 1:"Poor",2:"Poor",3:"Needs Work",4:"Needs Work",5:"Average",6:"Average",7:"Good",8:"Good",9:"Very Good",10:"Outstanding" \}/,
    "the rating anchors changed");
  for (const k of ["Preparation", "Communication", "Tactical Setup", "Emotional Control"]) {
    assert.ok(PAGE.includes(`key: "${k}"`), `construct missing or renamed: ${k}`);
  }
});

test("1c. a rating is MARKED, never graded", () => {
  // The old control filled every button up to the chosen value, which reads as
  // a gauge. One accent, at the selected value only.
  assert.ok(!CODE.includes("n <= value"), "the fill-up-to-value gauge is back");
  assert.ok(!/#F0A50022/.test(CODE.slice(CODE.indexOf("function RatingRow"), CODE.indexOf("function ChipSelector"))),
    "a partial-accent trail is back in the rating control");
  const row = CODE.slice(CODE.indexOf("function RatingRow"), CODE.indexOf("function ChipSelector"));
  assert.ok(!/(green|#2ECC71|#E74C3C|#3498DB)/i.test(row), "a rating is being coloured by its value");
});

// ── 2. ACTION PLAN INPUTS ───────────────────────────────────────────────────

test("2. no text field is under 16px, so iOS does not auto-zoom", () => {
  // Walk each field element from its tag to the self-closing bracket, rather
  // than trying to match a style object that contains nested braces.
  const fields = [];
  for (const m of CODE.matchAll(/<(textarea|input)\b/g)) {
    const end = CODE.indexOf("/>", m.index);
    assert.ok(end > -1, "a field element is not self-closing");
    fields.push(CODE.slice(m.index, end));
  }
  assert.ok(fields.length >= 4, `expected the app's text fields, found ${fields.length}`);
  let sized = 0;
  for (const f of fields) {
    const m = /fontSize:\s*(\d+)/.exec(f);
    if (!m) continue;            // the date control is sized in the stylesheet
    sized += 1;
    assert.ok(Number(m[1]) >= 16, `a text field is ${m[1]}px — iOS will zoom on focus`);
  }
  assert.ok(sized >= 3, "the inline-styled fields could not be found");
  // The date control, which is styled in CSS rather than inline.
  assert.match(CODE, /input\[type="date"\][^}]*font-size: 16px/, "the date control is under 16px");
});

test("2b. the Action Plan wording and gates are untouched", () => {
  for (const s of ["✓ KEEP DOING", "→ WILL CHANGE", "◆ HOW & WHEN",
                   "What must you maintain?", "What will you work on?",
                   "How and when will you work on it?"]) {
    assert.ok(PAGE.includes(s), `Action Plan wording changed: ${s}`);
  }
  assert.match(CODE, /if \(step === 4\) return action\.keep_doing\.trim\(\)\.length > 0 && action\.will_change\.trim\(\)\.length > 0;/,
    "the Action Plan validation gate changed");
});

// ── 3. iOS KEYBOARD ─────────────────────────────────────────────────────────

test("3. the submit bar is driven by the MEASURED visible region", () => {
  assert.match(CODE, /window\.visualViewport/, "the visible region is not measured");
  assert.match(CODE, /window\.innerHeight - vv\.height - vv\.offsetTop/,
    "the inset is not the proven formula");
  assert.match(CODE, /bottom:kbInset/, "the submit bar is not lifted onto the keyboard");
  assert.match(CODE, /paddingBottom: step === 5 \? 24 : 110 \+ kbInset/,
    "no scroll room is reserved for the lifted bar");
});

test("3b. scrolling happens only AFTER the reserved room has rendered", () => {
  // Doing this inside the resize handler scrolls against a page that has not
  // grown yet — the mistake that made the athlete product's first fix a no-op.
  assert.match(CODE, /\}, \[kbInset\]\)/, "the scroll is not keyed on the measured inset");
  assert.match(CODE, /vv\.addEventListener\("resize"/, "no resize subscription");
  assert.match(CODE, /vv\.addEventListener\("scroll"/, "no scroll subscription");
  assert.match(CODE, /vv\.removeEventListener/, "the subscription is never cleaned up");
});

test("3c. the reflection flow itself did not change", () => {
  assert.match(PAGE, /const STEP_LABELS = \["", "Ratings", "Went Well", "Development", "Action Plan", ""\]/,
    "the step labels changed");
  assert.match(PAGE, /const TOTAL_STEPS = 5/, "the step count changed");
  assert.match(CODE, /\{step === 4 \? "See My Review →" : step === 0 \? "Start →" : "Next →"\}/,
    "the step controls changed");
});

// ── 4. COMPLETION ───────────────────────────────────────────────────────────

test("4. the completion screen gives the coach back their own decision", () => {
  const done = CODE.slice(CODE.indexOf("{step === 5 &&"));
  // The RENDERED words, not merely a mention of the field. An earlier version
  // of this assertion looked for "action.will_change.trim()", which also occurs
  // in the surrounding guard — so deleting the block that actually displays the
  // sentence left the test passing. A mutation caught that.
  assert.match(done, /&ldquo;\{action\.will_change\.trim\(\)\}&rdquo;/,
    "the commitment is not rendered back to the coach");
  assert.match(done, /var\(--cq-voice\)[^>]*>&ldquo;\{action\.will_change\.trim\(\)\}/,
    "the commitment is not shown in the coach's own voice");
  assert.match(done, /\{action\.how_when\.trim\(\)\}<\/div>/,
    "the plan is not rendered back to the coach");
  // From state that was already stored. Nothing is fetched, derived or invented.
  assert.ok(!/follow|score|streak|average|trend|compar/i.test(done),
    "the completion screen grew an interpretation");
  // It reuses the instrument's OWN labels rather than inventing new copy.
  assert.ok(done.includes("→ WILL CHANGE"), "a new label was invented for the commitment");
  assert.ok(done.includes("◆ HOW &amp; WHEN"), "a new label was invented for the plan");
});

test("4b. the ratings and the rest of the completion screen are still there", () => {
  const done = CODE.slice(CODE.indexOf("{step === 5 &&"));
  assert.ok(done.includes("DONE, "), "the completion headline changed");
  assert.ok(done.includes("saved to your reviews"), "the completion subtitle changed");
  assert.ok(done.includes("MY REVIEWS") && done.includes("HOME"), "the completion controls changed");
  assert.ok(done.includes("RATINGS.map"), "the rating tiles were removed");
});

// ── 5. CQ PRODUCT-FAMILY TYPOGRAPHY ─────────────────────────────────────────

test("5. the CQ tokens are defined, wired and actually used", () => {
  for (const t of ["--cq-ui", "--cq-meta", "--cq-voice", "--cq-accent", "--cq-control"]) {
    assert.ok(CSS.includes(t), `token missing: ${t}`);
  }
  assert.match(LAYOUT, /GeistSans/, "the sans face is not loaded");
  assert.match(LAYOUT, /GeistMono/, "the mono face is not loaded");
  assert.match(LAYOUT, /import "\.\/globals\.css"/, "the stylesheet is still not imported");
  assert.match(LAYOUT, /GeistSans\.variable/, "the font variables never reach the document");
  assert.ok(!PAGE.includes("Courier New"), "a Courier declaration survived");
  assert.ok(!PAGE.includes("Georgia, serif"), "a raw Georgia declaration survived");
});

test("5b. the serif now means ONE thing: the coach's own words", () => {
  const voice = [...CODE.matchAll(/var\(--cq-voice\)/g)];
  assert.ok(voice.length >= 5, "the coach's voice is barely used");
  // Every serif site is a field the coach types into, or their words replayed.
  for (const marker of ["{rev.action.will_change}", "followUpOf(rev).response",
                        "followUpOf(rev).antecedent", "action.will_change.trim()"]) {
    assert.ok(CODE.includes(marker), `a coach-voice site is missing: ${marker}`);
  }
  // CQ's own copy must NOT be in the serif.
  const titles = ["Rate yourself.", "What went well today?", "What needs work?"];
  for (const t of titles) {
    const i = CODE.indexOf(t);
    const decl = CODE.slice(Math.max(0, i - 220), i);
    assert.ok(!decl.includes("--cq-voice"), `CQ's own copy is set in the coach's voice: ${t}`);
  }
});

// ── EXCLUDED BEHAVIOUR — none of this was allowed to move ───────────────────

test("EXCLUDED: storage key and cap are untouched", () => {
  assert.match(PAGE, /const STORAGE_KEY = "cq_coach_reviews"/, "the storage key changed");
  assert.match(CODE, /\.slice\(0, 20\)/, "the 20-review cap changed");
  assert.match(CODE, /e\.unshift\(review\)/, "newest-first ordering changed");
});

test("EXCLUDED: exactly one thing still leaves the device, and it is metadata", () => {
  const urls = [...CODE.matchAll(/fetch\(`?\$\{SUPABASE_URL\}([^`"]*)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(urls)].sort(), ["/functions/v1/sp-dashboard", "/rest/v1/completions"],
    "a new outbound path appeared");
  assert.match(CODE, /body: JSON\.stringify\(\{ team: TEAM, name, opposition, date, timestamp: Date\.now\(\) \}\)/,
    "the completion payload changed");
  for (const banned of ["review_backups", "reflection_events", "backupReview", "syncReviews", "track("]) {
    assert.ok(!CODE.includes(banned), `content upload or telemetry appeared: ${banned}`);
  }
});

test("EXCLUDED: the app is still telemetry-free and draft-free", () => {
  for (const banned of ["analytics", "reflection_started", "reflection_step_reached",
                        "_draft", "readDraft", "writeDraft", "buildDraft", "clearDraft"]) {
    assert.ok(!CODE.includes(banned), `out-of-scope machinery appeared: ${banned}`);
  }
  // localStorage is still touched under exactly one key.
  const keys = [...CODE.matchAll(/localStorage\.(?:get|set)Item\(\s*([A-Za-z_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(keys)], ["STORAGE_KEY"], "another storage key is in use");
});

test("EXCLUDED: the privacy disclosure is word for word what it was", () => {
  assert.ok(PAGE.includes("Your answers are saved on this phone only. CQ Perform keeps no copy — if you clear your browser or change device, they are gone."),
    "the first disclosure sentence changed");
  assert.ok(PAGE.includes("Your name, the opposition and the date are sent to Conor, so he can see that you completed a reflection — not what you wrote."),
    "the second disclosure sentence changed");
});

test("EXCLUDED: instrument content is unchanged", () => {
  assert.equal((PAGE.match(/"Clear pre-match message"/g) || []).length >= 1, true);
  for (const s of ["Created a challenge environment", "Threat environment created",
                   "Supported players post-game", "Lost composure under pressure"]) {
    assert.ok(PAGE.includes(s), `a chip disappeared: ${s}`);
  }
  assert.match(CODE, /if \(step === 2\) return wentWell\.length > 0;/, "a step gate changed");
  assert.match(CODE, /if \(step === 3\) return development\.length > 0;/, "a step gate changed");
});

test("EXCLUDED: match-date and longitudinal behaviour are unchanged", () => {
  assert.match(CODE, /match_date: info\.match_date, submitted_at: Date\.now\(\), date/,
    "the stored date fields changed");
  assert.match(CODE, /previousCommitment\(/, "the commitment replay was removed");
  assert.match(CODE, /orderedForDisplay\(/, "the display ordering was removed");
  assert.match(CODE, /followUpOf\(/, "the follow-up reader was removed");
});
