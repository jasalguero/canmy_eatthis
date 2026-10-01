# Hotline verification checklist

A person must do this: the registry says a number is verified only after someone has dialled it
(`packages/shared/src/hotlines.ts`, D30, `docs/05-safety-legal.md` §3). Release builds hide every
line with `verifiedAt: null`, so until this is done a release shows no phone numbers at all.

**Repeat before every release.** Numbers change.

## For each line

1. Open the `source` link in the registry and confirm the number on the page still matches.
2. Dial it from a real phone (not the emulator's dialler).
3. When someone or something answers, check all of:
   - It is the named service (they say so, or the recording does).
   - It takes calls about **pets** (ask: "do you take calls about a dog or cat that ate something?").
   - The cost matches the app's wording (the fee, or "standard rate" for a normal call).
   - The language(s) they answer in match `languages` in the registry.
   - The hours match (`hours24: true` means it is answered at any hour; test once outside office
     hours if you can, or read it on the service's own page).
4. Hang up before giving any details. You are checking the line, not reporting a case.
5. Record the result below, then set `verifiedAt` (ISO date) in the registry. If anything differs,
   fix the registry entry (`cost`, `languages`, `hours24`, `phone`, `display`) or **remove the
   entry**. A line that is not confirmed does not ship.

Calling from outside the country may cost you money or be blocked (the two US numbers are US
toll-free). If you cannot dial it yourself, ask someone in that country, and record who.

## Results

| Line | Region | Number | Dialled by | Date | Reached it | Takes pets | Cost as stated | Language | Hours | `verifiedAt` set |
|---|---|---|---|---|---|---|---|---|---|---|
| Servicio de Información Toxicológica (INTCF) | ES | 91 562 04 20 | | | | | | es | 24 h | |
| Animal PoisonLine | GB | 01202 509000 | | | | | | en | 24 h | |
| ASPCA Animal Poison Control Center | US | (888) 426-4435 | | | | | | en | 24 h | |
| Pet Poison Helpline | US | (855) 764-7661 | | | | | | en | 24 h | |

Not in the registry on purpose: **MX** (no single national line; centres are per hospital) and
**AR** (the Centro Nacional de Intoxicaciones is confirmed 24 h and free, but its page does not
say it takes animal calls). Add one only if a person confirms it takes pet calls.

## After verifying

- Set each `verifiedAt` and run `pnpm -r test` (a test asserts what a release shows).
- Check a release-style build (`__DEV__` false) shows the numbers and no "Not verified yet" note.
- Tick "Every hotline number dialled and verified by a person" in `docs/07` Phase 5.
