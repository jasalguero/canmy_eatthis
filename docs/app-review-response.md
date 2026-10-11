# App Review response (first-submission information request, 2026-10-06)

Paste section A as the reply in App Store Connect, and the same text into
App Review Information → Notes. Section B is the recording script.
Everything below was written from what the 1.0.0 binary does (`docs/10-store-submission.md` §0).

## A. Reply / Notes text

**1. Screen recording.** Attached, recorded on a physical iPhone running the latest iOS. It starts
at app launch and shows: first-run disclaimer, choosing Dog/Cat, a typed lookup ("chocolate" →
Toxic result with source), the emergency screen with the regional poison lines, a barcode scan,
and Settings (language and region). The app has no accounts, no user-generated content and no
paid features, so there are no registration, login, account-deletion, reporting/blocking or
purchase flows to show.

**2. Purpose and audience.** CanMyEatThis is a free reference tool for dog and cat owners. When a
pet has eaten, or an owner wants to give it, a food, plant or product, the app shows what
published veterinary sources say about whether it is toxic, and puts the nearest poison hotline
and an emergency-vet search one tap away. Problem: in a stressful moment owners search the web and
get contradictory or unsourced answers. Value: a clear verdict (Toxic / Not great / No known
toxicity / Not sure), the cited source on every result, dogs and cats answered separately, and an
emergency screen that works offline. It is not a vet and gives no diagnosis or dosing; this is
stated on first launch and on every result. Audience: adult pet owners (not directed at children).

**3. Access instructions.** No account, login, or sample files are needed. Open the app, accept
the first-run notice, choose Dog or Cat, type "chocolate" and tap Check: a "Toxic" result with a
source and a "Call a vet now" button. Tap that button to see the poison lines for the selected
region. For a barcode, tap "Scan a barcode" (camera permission) and scan any packaged food, e.g.
3017620422003. If the reviewer has no product to hand, typed lookups cover all main features.
Settings has separate Language (English/Español) and Region choices.

**4. External services.**
- Open Food Facts / Open Pet Food Facts (public product databases): when the user scans a barcode,
  the barcode number is sent to read the ingredients. No account or API key. Nothing else is sent.
- Google Maps (opened only if the user taps the emergency-vet search; handed off to Maps).
- Phone dialler (hotline numbers open via `tel:`).
- Everything else runs on the device: the veterinary knowledge base is bundled in the app, and
  verdicts come from that curated data, not from any AI model. This version contains no AI or
  photo-identification feature. There is no authentication provider, payment processor, analytics,
  advertising or crash-reporting service, and no server operated by us.

**5. Regional differences.** The app works the same in all regions. Two things vary by the Region
setting (separate from Language): the poison-hotline numbers (Spain, United Kingdom and United
States have verified lines; other regions show "no line for your region" plus the user's own vet and
the emergency-vet search) and the foods prioritised for the region. Region defaults from the
device and can be changed in Settings. Text is available in English and Spanish.

**6. Regulated industry / third-party material.** The app is a pet-toxicity reference, not a
medical device or human-health app, and offers no diagnosis, dosing or treatment. Content is
original summaries (no copied text) with a link to the cited public source (e.g. ASPCA, Pet Poison
Helpline, veterinary references); each entry cites at least two independent sources. No licences or
credentials are required. Hotline numbers were each dialled and confirmed to take pet calls.

## B. Recording script (physical iPhone, ~60–90 s, Settings → Control Centre → Screen Recording)

1. Start recording, then launch the app from the home screen (cold start).
2. Accept the first-run notice; show Dog/Cat toggle.
3. Type "chocolate" → Check → Toxic result; point at the source link.
4. Tap "Call a vet now" → emergency screen, regional lines (do not dial).
5. Back; type something harmless (e.g. "carrot") → No known toxicity result.
6. Scan a barcode (grant camera) → product ingredients → result.
7. Settings: switch Language to Español, then Region; show they are independent.
8. Stop recording.

## C. Before replying

- Use a Release/TestFlight build of 1.0.0 on the device, not the simulator.
- Check the sample barcode still resolves on Open Food Facts the day you record.
- Reply in App Store Connect (Resolution Center) *and* paste into Notes; attach the video there.
