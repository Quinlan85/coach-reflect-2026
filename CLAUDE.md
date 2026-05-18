# Coach Reflection App

Live at **coach.cqperform.ie** — a post-match self-reflection tool for coaches, built by Conor Quinlan (Sport Psychologist).

## Stack

- **Framework:** Next.js 14 (App Router), React 18
- **Deployment:** Vercel
- **Database:** Supabase — completions logged to the `completions` table, `team = "coach"`
- **Storage:** LocalStorage (`cq_coach_reviews`) for per-coach review history (max 20)

## Design

- Background: `#0A1520`
- Accent (green): `#2ECC71`
- Card surface: `#111D2C`
- Fonts: `'Courier New'` monospace for labels/UI, `Georgia` serif for body copy
- Mobile-first, single-page, inline styles throughout

## App Structure

All screens live in `app/page.jsx`. Screen state: `home → review (steps 0–5) | history | sp`.

**Review flow (5 steps):**
1. **Info** — name, team, opposition, match date
2. **Ratings** — Preparation, Communication, Tactical Setup, Emotional Control (1–10)
3. **Went Well** — chip multi-select from `WENT_WELL_PROMPTS`
4. **Development** — chip multi-select from `DEVELOPMENT_PROMPTS`
5. **Action Plan** — keep doing / will change / how & when (free text)

**SP Dashboard** — sport psychologist access, PIN-protected (`SP_PIN = "1810"`). Shows this-week completions and all-time totals per coach, pulled from Supabase.

## Confidentiality

Coach reflection answers are stored **locally only** (localStorage). Only completion metadata (name, opposition, date) is sent to Supabase — no ratings or written answers ever leave the device. The privacy notice on step 0 communicates this to coaches. Treat any changes to data handling as high-sensitivity.

## Supabase

- Project URL: `https://ccornucfqjfxhjurpbcu.supabase.co`
- Anon key in `app/page.jsx` (public, read-safe)
- Table: `completions` — columns: `team`, `name`, `opposition`, `date`, `timestamp`

## Key Constants (`app/page.jsx`)

| Constant | Value |
|---|---|
| `TEAM` | `"coach"` |
| `STORAGE_KEY` | `"cq_coach_reviews"` |
| `SP_PIN` | `"1810"` |

## Dev

```bash
npm run dev    # localhost:3000
npm run build
npm run start
```
