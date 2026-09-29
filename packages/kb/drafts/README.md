# packages/kb/drafts

Entries drafted by Claude from the listed sources, **awaiting review**. The build does not read
this directory, so nothing here ships. `src/drafts.test.ts` validates every draft against the
schema and against the live KB in `data/`, so a draft that passes CI can be promoted without
breaking the build.

A draft is either a **new entry** or a **revision** of a live entry in `data/` (same id and
filename). A revision is validated as if it had already replaced the live entry; the live version
stays in the app, unchanged, until the revision is promoted over it.

A draft claims no review it has not had: `review.status: draft`, `reviewed_by: null`, and
`translations.es` at `tier_a: draft` / `tier_b: draft`.

## Reviewing a draft

The editorial standard is `docs/04-knowledge-base.md` §2. For each draft:

1. Open **both** sources. Check that each one supports the verdict for **each** species, and that
   the summary, signs and onset say nothing the sources do not.
2. If a source doesn't cover a species, that species should be `unknown`. If the two sources
   disagree, the entry does not ship: delete it.
3. Read the Spanish as a native speaker: aliases, display name, headline and summary.

## Promoting a draft

1. `mv packages/kb/drafts/<id>.yaml packages/kb/data/` — for a revision this overwrites the live
   entry, which is the point.
2. Set `review.reviewed_by`, `review.reviewed_at` and `review.status: approved`.
3. Set `translations.es.tier_a: approved`, `tier_b: approved`, and its `reviewed_by` and
   `reviewed_at`.
4. `pnpm --filter @canmyeatthis/kb build && pnpm --filter @canmyeatthis/kb run sync:assets`,
   and commit the regenerated snapshots with the entry.
