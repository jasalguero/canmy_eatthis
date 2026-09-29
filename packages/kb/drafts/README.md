# packages/kb/drafts

Entries drafted by Claude from the listed sources, **awaiting review**. The build does not read
this directory, so nothing here ships. `src/drafts.test.ts` validates every draft against the
schema and against the live KB in `data/`, so a draft that passes CI can be promoted without
breaking the build.

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

1. `git mv packages/kb/drafts/<id>.yaml packages/kb/data/`
2. Set `review.reviewed_by`, `review.reviewed_at` and `review.status: approved`.
3. Set `translations.es.tier_a: approved`, `tier_b: approved`, and its `reviewed_by` and
   `reviewed_at`.
4. `pnpm --filter @canmyeatthis/kb build && pnpm --filter @canmyeatthis/kb run sync:assets`,
   and commit the regenerated snapshots with the entry.
