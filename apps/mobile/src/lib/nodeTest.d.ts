/**
 * The slices of Node's built-ins that Jest tests read the source tree with
 * (`i18n/noHardcodedStrings.test.ts`, `safety/safetyRules.test.tsx`). Tests run in Node; the app
 * never imports these, and the app has no `@types/node`.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
  export function mkdtempSync(prefix: string): string;
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
declare module 'node:module' {
  export function createRequire(path: string): (id: string) => unknown;
}
declare const __dirname: string;
declare namespace NodeJS {
  interface Require {
    resolve(id: string): string;
  }
}
