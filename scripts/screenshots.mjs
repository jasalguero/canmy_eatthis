#!/usr/bin/env node
/**
 * Captures the Phase 2 screenshot set into `docs/screenshots/`.
 *
 * docs/07-implementation-plan.md Phase 2 acceptance asks for four things this script produces
 * mechanically, so they are regenerated rather than curated by hand:
 *
 *   - light and dark screenshots of every screen
 *   - grayscale screenshots proving the four verdicts stay distinguishable without colour
 *   - `es` at 200% font scale — "the worst case, and the one that breaks the verdict banner"
 *   - a check that the build makes **zero network calls**
 *
 * It runs against the real web export (`expo export --platform web --dev`), driven with
 * Playwright. `--dev` matters: `__DEV__` gates the component gallery, which is one of the
 * screens that has to be reviewable.
 *
 * ## What the web build can and cannot stand in for
 *
 * The web export is the same React tree, the same components and the same tokens as the native
 * app, so it is a faithful check of layout, colour, contrast, wrapping and copy. It is **not** a
 * substitute for a device pass on the things that only exist natively: haptics, the reveal
 * animation's feel, VoiceOver and TalkBack focus order, and the platform's own font-scaling
 * behaviour. Those are verified on a simulator and recorded in `docs/screenshots/README.md`.
 *
 * ## How 200% font scale is simulated
 *
 * React Native Web does not read the OS font scale, so there is nothing to turn up. What an OS
 * font scale actually does to a React Native `<Text>` is multiply its font size and line height
 * while leaving every layout box alone — and NativeWind emits this app's six type-scale roles as
 * plain CSS classes with px values. So overriding exactly those six classes with doubled values
 * reproduces the real behaviour rather than approximating it. `zoom` or a root `font-size` would
 * not: the first scales the layout too, the second compounds per nesting level.
 *
 * The doubled values are computed from `tokens.ts`, so the simulation cannot drift from the
 * type scale it is meant to be doubling.
 *
 * ## Why the viewport grows instead of `fullPage: true`
 *
 * A React Native `ScrollView` is a real clipping container on web, so `fullPage` captures only
 * what is above the fold — on the severe result screen that cut the page off halfway through
 * "What to do now". Unclipping it with CSS does show everything, but it breaks the layout it was
 * supposed to be documenting: the sticky footer is a flex sibling of the scroll area, and once
 * the area stops being scrollable the footer floats up into the content.
 *
 * So instead the viewport is grown to the height the content actually needs and the screen is
 * captured normally. The flex layout resolves exactly as it does on a device — footer pinned to
 * the bottom, banner full-bleed at the top — and nothing is hidden. It is the same thing as
 * photographing the screen on a taller phone.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { extname, join } from 'node:path';
import createJiti from 'jiti';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'apps/mobile/dist');
const OUT = join(ROOT, 'docs/screenshots');

const jiti = createJiti(join(ROOT, 'apps/mobile/tailwind.config.js'), { interopDefault: true });
const { typography } = jiti(join(ROOT, 'apps/mobile/src/theme/tokens.ts'));
const { MOCK_ENTRIES } = jiti(join(ROOT, 'apps/mobile/src/mock/kbEntries.ts'));

/** iPhone-ish. Small enough to be the honest worst case for wrapping. */
const VIEWPORT = { width: 390, height: 844 };
const SETTINGS_KEY = 'canmyeatthis.settings.v1';
/** Must match PSEUDO_LOCALE in apps/mobile/src/i18n/pseudoLocale.ts. */
const PSEUDO_LOCALE = 'en-XA';
/** Ceiling on a grown viewport, so a broken layout cannot produce an enormous image. */
const MAX_CAPTURE_HEIGHT = 6000;

/** Every screen, with the params that select its state. */
/**
 * Strings that legitimately are not pseudo-localised, for the pseudo-locale pass below.
 *
 * Knowledge-base prose (display names, headlines, summaries, source labels) is *content*, not
 * interface copy: it is authored per language in `packages/kb` and does not pass through `t()`,
 * so it correctly stays un-mangled. Region codes are identifiers. Everything else that renders
 * without the pseudo marker is a hardcoded string and a bug.
 */
function kbStrings() {
  const out = new Set();
  const walk = (node) => {
    if (typeof node === 'string') {
      out.add(node);
      return;
    }
    if (node && typeof node === 'object') for (const v of Object.values(node)) walk(v);
  };
  walk(MOCK_ENTRIES);
  for (const region of ['ES', 'US', 'MX', 'AR', 'GB']) out.add(region);
  return out;
}

const SCREENS = [
  { name: '01-home', path: '/' },
  { name: '02-identifying', path: '/identifying?hasPhoto=1' },
  // Text-only: different stages, because a typed check resolves on device and sends nothing.
  { name: '02b-identifying-text', path: '/identifying?hasPhoto=0' },
  { name: '03-confirm', path: '/confirm' },
  { name: '04-confirm-plant', path: '/confirm?plant=1' },
  { name: '05-result-safe', path: '/result?case=safe-dog&still=1', verdict: true },
  { name: '06-result-caution', path: '/result?case=caution-dog&still=1', verdict: true },
  { name: '07-result-toxic-mild', path: '/result?case=toxic-mild-dog&still=1', verdict: true },
  {
    name: '08-result-toxic-moderate',
    path: '/result?case=toxic-moderate-dog&still=1',
    verdict: true,
  },
  {
    name: '09-result-toxic-severe',
    path: '/result?case=toxic-severe-dog&still=1',
    verdict: true,
  },
  { name: '10-result-unknown', path: '/result?case=unknown-cat&still=1', verdict: true },
  {
    name: '11-result-severe-cat',
    path: '/result?case=toxic-severe-cat&still=1',
    verdict: true,
  },
  { name: '12-history', path: '/history' },
  { name: '13-profile', path: '/profile' },
  { name: '14-settings', path: '/settings' },
  { name: '15-first-run', path: '/first-run' },
  { name: '16-error-offline', path: '/error?code=offline' },
  { name: '17-error-spend-cap', path: '/error?code=SPEND_CAP_EXCEEDED' },
  { name: '18-error-image-unusable', path: '/error?code=IMAGE_UNUSABLE' },
  { name: '19-error-no-subject', path: '/error?code=NO_SUBJECT_FOUND' },
  { name: '20-error-rate-limited', path: '/error?code=RATE_LIMITED' },
  { name: '21-error-provider-down', path: '/error?code=PROVIDER_UNAVAILABLE' },
  { name: '22-error-unauthenticated', path: '/error?code=UNAUTHENTICATED' },
  { name: '23-error-attestation', path: '/error?code=ATTESTATION_FAILED' },
  { name: '24-error-invalid-request', path: '/error?code=INVALID_REQUEST' },
  { name: '25-error-internal', path: '/error?code=INTERNAL' },
  { name: '26-gallery', path: '/gallery' },
];

/** CSS that doubles exactly the six type-scale roles — see the header. */
const fontScale200 = Object.entries(typography)
  .map(
    ([role, spec]) =>
      `.text-${role}{font-size:${spec.size * 2}px !important;line-height:${spec.lineHeight * 2}px !important}`,
  )
  .join('\n');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** Static server with SPA fallback — the export is a single-page build. */
function serve(port) {
  const server = http.createServer((req, res) => {
    let path = join(DIST, decodeURIComponent((req.url ?? '/').split('?')[0]));
    if (!existsSync(path) || !extname(path)) path = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(readFileSync(path));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(
      'No web export found. Run:\n  pnpm --filter @canmyeatthis/mobile exec expo export --platform web --dev',
    );
    process.exit(1);
  }

  const port = 8767;
  const server = await serve(port);
  const base = `http://localhost:${port}`;

  // Clear the image folders only — `docs/screenshots/README.md` is hand-written and explains
  // what this set is and how it was captured. Wiping `OUT` wholesale would delete it.
  for (const dir of ['light', 'dark', 'grayscale', 'es-200']) {
    rmSync(join(OUT, dir), { recursive: true, force: true });
    mkdirSync(join(OUT, dir), { recursive: true });
  }

  // `channel: 'chrome'` uses the system Chrome rather than a downloaded browser build.
  const browser = await chromium.launch({ channel: 'chrome' });

  /** Every request the app made that did not come from our own static server. */
  const offSiteRequests = new Set();

  async function capture({ dir, scheme, language, grayscale = false, fontScale = false, only }) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      colorScheme: scheme,
      locale: language === 'es' ? 'es-ES' : 'en-GB',
      reducedMotion: 'reduce', // deterministic frames: no mid-animation screenshots
    });

    // Seed the persisted settings store directly — this is the same key zustand/persist writes.
    await context.addInitScript(
      ([key, lang]) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            state: {
              language: lang,
              region: 'ES',
              appearance: 'system',
              photoIdConsent: true,
              onboarded: true,
            },
            version: 0,
          }),
        );
      },
      [SETTINGS_KEY, language],
    );

    context.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        offSiteRequests.add(url);
      }
    });

    const page = await context.newPage();

    for (const screen of SCREENS) {
      if (only && !only(screen)) continue;
      await page.setViewportSize(VIEWPORT);
      await page.goto(base + screen.path, { waitUntil: 'networkidle' });
      // The app mounts asynchronously; wait for real content rather than a fixed sleep.
      await page.waitForSelector('text=/\\S/', { timeout: 15000 });
      await page.waitForTimeout(350);

      const css = [grayscale ? 'html{filter:grayscale(1)}' : '', fontScale ? fontScale200 : '']
        .filter(Boolean)
        .join('\n');
      if (css) {
        await page.addStyleTag({ content: css });
        await page.waitForTimeout(250);
      }

      // Grow the viewport by however much the scroll area is overflowing, then let it settle
      // and re-measure: at 200% font scale, more height means different wrapping means a
      // different overflow. Bounded, so a runaway layout cannot produce a 40,000px image.
      for (let pass = 0; pass < 3; pass++) {
        const overflow = await page.evaluate(() =>
          Math.max(
            0,
            ...[...document.querySelectorAll('*')]
              .filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowY))
              .map((el) => el.scrollHeight - el.clientHeight),
          ),
        );
        if (overflow <= 1) break;
        const current = page.viewportSize() ?? VIEWPORT;
        const height = Math.min(current.height + overflow, MAX_CAPTURE_HEIGHT);
        if (height === current.height) break;
        await page.setViewportSize({ width: VIEWPORT.width, height });
        await page.waitForTimeout(250);
      }

      await page.screenshot({ path: join(OUT, dir, `${screen.name}.png`) });
    }

    await context.close();
  }

  console.log('light…');
  await capture({ dir: 'light', scheme: 'light', language: 'en' });
  console.log('dark…');
  await capture({ dir: 'dark', scheme: 'dark', language: 'en' });
  console.log('grayscale (verdict screens)…');
  await capture({
    dir: 'grayscale',
    scheme: 'light',
    language: 'en',
    grayscale: true,
    only: (s) => s.verdict,
  });
  console.log('es at 200% font scale…');
  await capture({ dir: 'es-200', scheme: 'light', language: 'es', fontScale: true });

  console.log('pseudo-locale (hardcoded-string check)…');
  const hardcoded = await checkPseudoLocale(browser, base);

  await browser.close();
  server.close();

  if (hardcoded.length > 0) {
    console.error(
      '\nFAIL: strings rendered without passing through t() (AGENTS.md #11, docs/07 Phase 2:',
    );
    console.error('"A pseudo-locale run surfaces zero hardcoded strings"):');
    for (const { screen, text } of hardcoded) console.error(`  ${screen}: ${JSON.stringify(text)}`);
    process.exitCode = 1;
  }

  if (offSiteRequests.size > 0) {
    console.error('\nFAIL: the build made network calls (docs/07 Phase 2: zero network calls):');
    for (const url of offSiteRequests) console.error(`  ${url}`);
    process.exit(1);
  }

  if (process.exitCode) process.exit(1);

  console.log(
    '\nOK: screenshots written to docs/screenshots/; the build made no network calls; every ' +
      'user-facing string went through t().',
  );
}

/**
 * Runs every screen in the pseudo-locale and reports any visible text that was not localised.
 *
 * The pseudo-locale wraps each message in `[...]` and accents its vowels, so a rendered string
 * without a bracket did not come from `t()`. The gallery is excluded deliberately: it is
 * `__DEV__`-only scaffolding whose labels ("Primitives", "Screens", "light") are developer
 * copy that is never shown to a user and is intentionally not translated.
 */
async function checkPseudoLocale(browser, base) {
  const allowed = kbStrings();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(
    ([key, pseudo]) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          state: {
            language: pseudo,
            region: 'ES',
            appearance: 'system',
            photoIdConsent: true,
            onboarded: true,
          },
          version: 0,
        }),
      );
    },
    [SETTINGS_KEY, PSEUDO_LOCALE],
  );

  const page = await context.newPage();
  const findings = [];

  for (const screen of SCREENS) {
    if (screen.name.endsWith('gallery')) continue;
    await page.goto(base + screen.path, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=/\\S/', { timeout: 15000 });
    await page.waitForTimeout(350);

    const texts = await page.evaluate(() => {
      // Walk the app's own root, not `document.body`: index.html ships a `<noscript>` telling
      // the visitor to enable JavaScript, which is real text in the document but is not this
      // app's copy and cannot go through `t()`.
      const root = document.getElementById('root') ?? document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = [];
      let node = walker.nextNode();
      while (node) {
        const text = (node.textContent ?? '').trim();
        if (text && !node.parentElement?.closest('noscript')) out.push(text);
        node = walker.nextNode();
      }
      // Placeholders are attributes, not text nodes, and are just as user-facing.
      for (const el of root.querySelectorAll('[placeholder]')) {
        const value = el.getAttribute('placeholder');
        if (value) out.push(value.trim());
      }
      return out;
    });

    for (const text of texts) {
      if (text.includes('[')) continue; // pseudo-localised
      if (!/\p{Letter}/u.test(text)) continue; // glyphs, bullets, digits
      if (allowed.has(text)) continue; // knowledge-base content
      findings.push({ screen: screen.name, text });
    }
  }

  await context.close();
  return findings;
}

await main();
