// history.mjs — the small amount of NEW logic this patch introduces, kept pure
// so it can be tested under plain `node --test`. No I/O, no clock, no storage.
//
// Three jobs, and deliberately nothing else:
//
//   1. Find the coach's PREVIOUS commitment so it can be replayed verbatim.
//   2. Describe a stored reflection's date HONESTLY, which for legacy records
//      means admitting we do not know when the match was.
//   3. Say whether a follow-up was recorded, without judging it.
//
// WHAT THIS MODULE MUST NEVER DO. No scoring, no counting of kept versus broken
// commitments, no theme detection, no comparison between reflections. The
// follow-up is the coach's own sentence and is preserved as written. Whether a
// commitment was "met" is not a question this product asks, because the answer
// would be a compliance judgement the instrument cannot support.

// A commitment is replayable exactly when there is something to replay.
export function hasCommitment(review) {
  return !!review && !!review.action &&
    typeof review.action.will_change === "string" &&
    review.action.will_change.trim().length > 0;
}

// The most recent stored reflection carrying a commitment.
//
// Reviews are stored newest-first (saveReview unshifts), so the first match is
// the most recent. Returns the antecedent TEXT, which is what gets copied into
// the new reflection — never an index. Identifying a follow-up's subject by
// position is the mistake the athlete product already paid for; the text is
// self-identifying and survives a deleted or reordered history.
export function previousCommitment(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  for (const review of list) {
    if (hasCommitment(review)) {
      return {
        text: review.action.will_change.trim(),
        keep_doing: typeof review.action.keep_doing === "string"
          ? review.action.keep_doing.trim() : "",
        how_when: typeof review.action.how_when === "string"
          ? review.action.how_when.trim() : "",
        date: dateLabel(review),
      };
    }
  }
  return null;
}

// HOW A STORED REFLECTION'S DATE IS DESCRIBED.
//
// New records carry `match_date`, which the coach typed, and `submitted_at`,
// the epoch millisecond they finished. Legacy records carry neither: they have
// only `date`, a localised display string generated at submit time. That is
// when the form was filled, NOT when the match was played, and the two can be
// days apart.
//
// So legacy records are labelled "logged", not "match". Nothing is rewritten,
// nothing is inferred, and a submission date is never presented as a match
// date. `stated` tells the caller which it is holding.
export function dateLabel(review) {
  const stated = review && typeof review.match_date === "string" &&
    review.match_date.trim() !== "";
  if (stated) {
    return { text: formatMatchDate(review.match_date), stated: true };
  }
  const legacy = review && typeof review.date === "string" ? review.date : "";
  return { text: legacy, stated: false };
}

// `YYYY-MM-DD` (what an <input type="date"> yields) rendered the way the rest
// of the app writes dates. Anything that is not that shape is passed through
// untouched rather than guessed at.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function formatMatchDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return String(iso || "").trim();
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return String(iso).trim();
  return `${Number(m[3])} ${month} ${m[1]}`;
}

// PARTITIONED, NOT INTERLEAVED, and that is the honest part.
//
// Records with a coach-stated match date can be placed on a match timeline, so
// they are ordered newest match first. Legacy records cannot: we know when the
// form was filled and not when the match was. Rather than guess a position for
// them, they are kept as a separate group in the order they were saved.
//
// The first version of this function tried to interleave the two, comparing by
// date when both had one and by saved position otherwise. That comparator is
// not transitive — a stated record can sort before a legacy record that sorts
// before a second stated record that sorts before the first — and the sort
// result was therefore arbitrary. A test caught it. Partitioning is both
// correct and a truer description of what is known.
export function orderedForDisplay(reviews) {
  const list = Array.isArray(reviews) ? reviews.filter((r) => r !== null && r !== undefined) : [];
  const stated = list
    .map((review, index) => ({ review, index, key: statedKey(review) }))
    .filter((e) => e.key !== null)
    .sort((a, b) => (a.key === b.key ? a.index - b.index : (a.key < b.key ? 1 : -1)))
    .map((e) => e.review);
  const legacy = list.filter((review) => statedKey(review) === null);
  return [...stated, ...legacy];
}

function statedKey(review) {
  return review && typeof review.match_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(review.match_date.trim())
    ? review.match_date.trim()
    : null;
}

// Was a follow-up recorded? Absence is absence — it is NOT a missed commitment,
// and no caller may render it as one.
export function followUpOf(review) {
  const f = review && review.follow_up;
  if (!f || typeof f !== "object") return null;
  const antecedent = typeof f.previous_will_change === "string"
    ? f.previous_will_change.trim() : "";
  const response = typeof f.response === "string" ? f.response.trim() : "";
  if (antecedent === "" && response === "") return null;
  return { antecedent, response };
}
