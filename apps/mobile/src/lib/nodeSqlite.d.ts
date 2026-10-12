/**
 * The slice of Node's built-in `node:sqlite` that `history.test.ts` uses to run the history SQL
 * for real under Jest. The app itself never imports it, and the app has no `@types/node`.
 */
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;
  interface StatementSync {
    run(...params: Value[]): unknown;
    all(...params: Value[]): unknown[];
    get(...params: Value[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(source: string): void;
    prepare(source: string): StatementSync;
  }
}
