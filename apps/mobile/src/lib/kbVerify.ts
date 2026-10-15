import {
  type KbBundle,
  KbBundleSchema,
  type KbManifest,
  KbManifestSchema,
  resolveVerdict,
} from '@canmyeatthis/shared';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import nacl from 'tweetnacl';

import { vocabEn, vocabEs } from '@/i18n/vocab';

/**
 * Everything a downloaded KB must pass before the app will answer from it (docs/02 D38). Pure, so
 * it is tested without a device or a network. The order is cheapest-first, and each step names
 * its failure, which is all a caller does with one: keep the KB it already has.
 */
export type VerifyResult = { ok: true; bundle: KbBundle } | { ok: false; reason: string };

export function verifyKbDownload(params: {
  manifest: unknown;
  body: string;
  publicKeyBase64: string;
  appVersion: string;
  language: KbManifest['lang'];
}): VerifyResult {
  const parsedManifest = KbManifestSchema.safeParse(params.manifest);
  if (!parsedManifest.success) return { ok: false, reason: 'manifest does not match the schema' };
  const manifest = parsedManifest.data;

  if (manifest.lang !== params.language) return { ok: false, reason: 'wrong language' };
  if (compareVersions(params.appVersion, manifest.minAppVersion) < 0) {
    return { ok: false, reason: `needs app ${manifest.minAppVersion}` };
  }
  if (!manifest.signature) return { ok: false, reason: 'unsigned' };

  const bytes = utf8ToBytes(params.body);
  if (bytes.length !== manifest.sizeBytes) return { ok: false, reason: 'size mismatch' };
  if (bytesToHex(sha256(bytes)) !== manifest.sha256) return { ok: false, reason: 'hash mismatch' };
  if (!verifySignature(bytes, manifest.signature, params.publicKeyBase64)) {
    return { ok: false, reason: 'bad signature' };
  }

  let json: unknown;
  try {
    json = JSON.parse(params.body);
  } catch {
    return { ok: false, reason: 'not JSON' };
  }
  const parsed = KbBundleSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: 'bundle does not match the schema' };
  const bundle = parsed.data;

  if (bundle.lang !== manifest.lang || bundle.version !== manifest.version) {
    return { ok: false, reason: 'bundle does not match its manifest' };
  }
  if (bundle.entries.length !== manifest.entryCount) {
    return { ok: false, reason: 'entry count mismatch' };
  }
  const ids = new Set(bundle.entries.map((entry) => entry.id));
  if (Object.values(bundle.index).some((id) => !ids.has(id))) {
    return { ok: false, reason: 'index points at a missing entry' };
  }
  // Signs and emergency actions are ids translated in the app (AGENTS.md #13). An update cannot
  // bring new ones: an id this build has no text for would show as a raw key in an emergency.
  const vocab = params.language === 'es' ? vocabEs : vocabEn;
  for (const entry of bundle.entries) {
    for (const species of ['dog', 'cat'] as const) {
      const row = entry.species[species];
      const missing =
        row.signs.some((id) => !vocab[`signs.${id}`]) ||
        row.emergency_actions.some((id) => !vocab[`emergency_actions.${id}`]);
      if (missing) return { ok: false, reason: 'uses a sign or action this app cannot show' };
    }
  }
  // The same invariants every bundled verdict passes (AGENTS.md #5): resolveVerdict throws on an
  // entry that would break one, such as a toxic row with no emergency actions.
  try {
    for (const entry of bundle.entries) {
      for (const species of ['dog', 'cat'] as const) {
        resolveVerdict({ entry, species, kbVersion: bundle.version, disclaimer: '-' });
      }
    }
  } catch {
    return { ok: false, reason: 'an entry breaks a verdict invariant' };
  }
  return { ok: true, bundle };
}

function verifySignature(message: Uint8Array, signatureBase64: string, keyBase64: string): boolean {
  try {
    return nacl.sign.detached.verify(
      message,
      base64ToBytes(signatureBase64),
      base64ToBytes(keyBase64),
    );
  } catch {
    return false;
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64, without relying on `atob`, which not every Hermes build exposes. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.trim().replace(/=+$/, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = B64.indexOf(char);
    if (index < 0) throw new Error('invalid base64');
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/** Dotted numeric versions: `compareVersions('1.10.0', '1.9.2') > 0`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
