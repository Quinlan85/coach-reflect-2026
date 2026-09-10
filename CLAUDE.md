# Coach Reflection App

Live at **coach.cqperform.ie** — a post-match self-reflection tool for coaches, built by Conor Quinlan (Sport Psychologist).

## Stack

- **Framework:** Next.js 14 (App Router), React 18
- **Deployment:** Vercel
- **Database:** Supabase — completions logged to the `completions` table, `team = "coach"`
- **Storage:** LocalStorage (`cq_coach_reviews`) for per-coach review history (max 20)
- **Longitudinal logic:** `app/history.mjs` — a pure module (no I/O, clock or storage) covered by `tests/history.test.mjs` (`npm test`)

## Design

- Background: `#0A1520`
- Accent (green): `#2ECC71`
- Card surface: `#111D2C`
- Fonts: `'Courier New'` monospace for labels/UI, `Georgia` serif for body copy
- Mobile-first, single-page, inline styles throughout

## App Structure

All screens live in `app/page.jsx`. Screen state: `home → review (steps 0–5) | history | sp`.

**Review flow (5 steps):**
1. **Info** — name, opposition, match date (`<input type="date">`, pre-filled with today, editable)
2. **Ratings** — Preparation, Communication, Tactical Setup, Emotional Control (1–10)
3. **Went Well** — chip multi-select from `WENT_WELL_PROMPTS`
4. **Development** — chip multi-select from `DEVELOPMENT_PROMPTS`
5. **Action Plan** — the previous `will_change` replayed verbatim with one optional free-text follow-up, then keep doing / will change / how & when (free text)

**SP Dashboard** — sport psychologist access. The PIN is verified server-side by the `sp-dashboard` edge function and is held as a Supabase secret; no PIN is stored in this repository. Shows this-week completions and all-time totals per coach.

## Confidentiality

Coach reflection answers are stored **locally only** (localStorage). Only completion metadata (name, opposition, date) is sent to Supabase — no ratings, written answers or follow-ups ever leave the device. The disclosure on step 0 says this in the coach's own terms, including that clearing the browser or changing device loses everything. Treat any changes to data handling as high-sensitivity.

Adding the app to the Home Screen improves how it launches. It does **not** make storage permanent, and no product or privacy copy may claim otherwise.

## Supabase

- Project URL: `https://ccornucfqjfxhjurpbcu.supabase.co`
- Anon key in `app/page.jsx` (public, read-safe)
- Table: `completions` — columns: `team`, `name`, `opposition`, `date`, `timestamp`

## Key Constants (`app/page.jsx`)

| Constant | Value |
|---|---|
| `TEAM` | `"coach"` |
| `STORAGE_KEY` | `"cq_coach_reviews"` |

## Stored review shape

```
{ name, opposition, match_date: "YYYY-MM-DD", submitted_at: <epoch ms>,
  date: "<localised submit-time string>", ratings, went_well, development,
  action: { keep_doing, will_change, how_when },
  follow_up?: { previous_will_change, response } }
```

`match_date` is when the game was played and the coach typed it. `submitted_at`
and `date` are when the form was filled — a different fact. **Records saved
before this patch have only `date`**; they are displayed as "logged <date>" and
must never be back-filled, inferred or relabelled as match dates.

`follow_up` carries the antecedent commitment as **text**, not a reference, so
the pairing survives a deleted or reordered history. It is written only when the
coach actually answered. A missing `follow_up` means no answer was given — it is
**not** a missed commitment, and nothing may present it as one.

## What this product deliberately does not do

No scoring, streaks, compliance rates, recurring-theme detection, coach ranking
or comparison between reflections. Ratings and completion counts are shown in
neutral colour, never as red/amber/green verdicts on a coach. These are enforced
by prohibition tests in `tests/history.test.mjs`.

## Dev

```bash
npm run dev    # localhost:3000
npm run build
npm run start
```
