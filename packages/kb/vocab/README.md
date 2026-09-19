# packages/kb/vocab

Controlled-vocabulary translations for `signs` and `emergency_actions`
(`docs/09-localisation.md` §1, `docs/04-knowledge-base.md` §1). Ids are defined in
`../schema/vocab.ts`; every id used by any KB entry must have a translation here in every
language the build treats as shipped (`SHIPPED_LANGUAGES` in `../src/build.ts`).

Both `en.json` and `es.json` are fully approved translations.
