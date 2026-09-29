import type { Alternate, Candidate, VerdictPayload } from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';
import {
  MOCK_ALTERNATES,
  MOCK_CANDIDATES,
  MOCK_HISTORY,
  MOCK_PLANT_CANDIDATE,
  findMockCase,
  mockVerdict,
} from '@/mock/cases';
import { MOCK_PHOTO_URI } from '@/mock/photos';

/**
 * The only way mock data reaches a screen outside the gallery (`mock.test.ts` enforces it).
 *
 * The gallery opens real screens in fixed states — a result for each verdict, the photo Confirm,
 * a filled history — and the unbuilt photo path still runs on mocks in development. Every function
 * here returns `null` outside a development build, so a release can never show a mock verdict, a
 * made-up candidate or someone else's history, whatever parameters a screen is opened with.
 *
 * `isDev` is a parameter only so tests can check the release behaviour.
 */

export function devResultPayload(
  caseId: string,
  language: SupportedLanguage,
  disclaimer: string,
  isDev: boolean = __DEV__,
): VerdictPayload | null {
  if (!isDev) return null;
  const mockCase = findMockCase(caseId);
  return mockCase ? mockVerdict(mockCase, language, disclaimer) : null;
}

export interface DevConfirm {
  primary: Candidate;
  alternates: readonly Alternate[];
  photoUri: string;
  /** The mock result a confirmation leads to. */
  resultCaseId: string;
}

/** The photo path's Confirm, which has no real candidates until photo identification exists. */
export function devConfirm(isPlant: boolean, isDev: boolean = __DEV__): DevConfirm | null {
  if (!isDev) return null;
  return isPlant
    ? {
        primary: MOCK_PLANT_CANDIDATE,
        alternates: [],
        photoUri: MOCK_PHOTO_URI,
        resultCaseId: 'toxic-severe-cat',
      }
    : {
        primary: MOCK_CANDIDATES[0],
        alternates: MOCK_ALTERNATES,
        photoUri: MOCK_PHOTO_URI,
        resultCaseId: 'toxic-moderate-dog',
      };
}

/** A stand-in photo for the scanning screen when the draft has none. */
export function devPhotoUri(isDev: boolean = __DEV__): string | null {
  return isDev ? MOCK_PHOTO_URI : null;
}

export interface DevHistoryRow {
  id: string;
  /** The gallery case the row opens. */
  caseId: string;
  checkedAt: Date;
  payload: VerdictPayload;
}

/** History has no store yet (docs/07, after the first release), so only development builds show these rows. */
export function devHistoryRows(
  language: SupportedLanguage,
  disclaimer: string,
  isDev: boolean = __DEV__,
): DevHistoryRow[] {
  if (!isDev) return [];
  return MOCK_HISTORY.flatMap((row) => {
    const mockCase = findMockCase(row.caseId);
    return mockCase
      ? [
          {
            id: row.id,
            caseId: row.caseId,
            checkedAt: row.checkedAt,
            payload: mockVerdict(mockCase, language, disclaimer),
          },
        ]
      : [];
  });
}
