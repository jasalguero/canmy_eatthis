import { en, es, initI18n } from './index';
import { AUTHORED_NAMESPACES, NAMESPACES } from './namespaces';

/**
 * AGENTS.md #11: every user-facing string exists in both `en` and `es`. A missing Spanish key
 * does not fail loudly at runtime — i18next silently falls back to English — so the only place
 * this can be caught is here.
 */

type Catalogue = Record<string, Record<string, string>>;

/**
 * The set of ICU *argument* names a message uses, at any nesting depth.
 *
 * A regex cannot do this: in `{species, select, dog {perro} other {gato}}` the inner `{perro}`
 * is a branch body, not an argument, and a naive `/\{(\w+)/` reports `perro` and `gato` as
 * variables — which differ between languages by design. So this walks the message properly:
 * inside a select/plural the parser expects `key {submessage}` pairs, and only a `{` in message
 * position starts an argument. It throws on unbalanced braces, which is itself worth catching.
 */
function icuArguments(message: string): Set<string> {
  const args = new Set<string>();
  let i = 0;

  const skipSpace = () => {
    while (i < message.length && /\s/.test(message[i])) i++;
  };
  const readToken = () => {
    const start = i;
    while (i < message.length && !/[\s,{}]/.test(message[i])) i++;
    return message.slice(start, i);
  };

  /** Parses a message body, stopping at the `}` that closes it (or at end of input). */
  const parseMessage = () => {
    while (i < message.length) {
      const ch = message[i];
      if (ch === '}') return;
      if (ch !== '{') {
        i++;
        continue;
      }
      i++; // consume '{'
      skipSpace();
      args.add(readToken());
      skipSpace();
      if (message[i] === ',') {
        i++;
        skipSpace();
        const type = readToken();
        skipSpace();
        if (message[i] === ',') {
          i++;
          if (type === 'select' || type === 'plural' || type === 'selectordinal') {
            // `key {submessage}` pairs until the argument closes.
            skipSpace();
            while (i < message.length && message[i] !== '}') {
              readToken(); // branch key — translated-side values differ, so not compared
              skipSpace();
              if (message[i] !== '{') break;
              i++; // consume '{'
              parseMessage();
              if (message[i] !== '}') throw new Error(`unbalanced braces in: ${message}`);
              i++; // consume '}'
              skipSpace();
            }
          } else {
            // A simple style argument (date/number/time): no nested messages.
            while (i < message.length && message[i] !== '}') i++;
          }
        }
      }
      if (message[i] !== '}') throw new Error(`unbalanced braces in: ${message}`);
      i++; // consume '}'
    }
  };

  parseMessage();
  if (i !== message.length) throw new Error(`unbalanced braces in: ${message}`);
  return args;
}

describe('initI18n', () => {
  it('initialises once and never switches language on a later call', () => {
    // Regression guard. `initI18n` used to call `changeLanguage` when re-entered with a
    // different language, and because i18next notifies every `useTranslation` subscriber, that
    // set state on other components mid-render — React's "Cannot update a component while
    // rendering a different component". Switching language is an effect's job (see
    // src/app/_layout.tsx); this function must stay inert on re-entry.
    const first = initI18n('en');
    const second = initI18n('es');
    expect(second).toBe(first);
    expect(first.language).toBe('en');
  });

  it('once i18next is initialised, neither re-runs init nor emits anything', () => {
    // Regression guard for the Fast Refresh case. "Already initialised" used to be a flag in the
    // i18n module; re-running that module (any catalogue edit) reset it, so the next call ran
    // `init` again, whose `languageChanged` updated every mounted `useTranslation` subscriber
    // mid-render. The guard now reads i18next's own state, which a module re-run cannot reset.
    const instance = initI18n('en');
    expect(instance.isInitialized).toBe(true);
    const init = jest.spyOn(instance, 'init');
    const emit = jest.spyOn(instance, 'emit');
    try {
      initI18n('es');
      expect(init).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    } finally {
      init.mockRestore();
      emit.mockRestore();
    }
  });
});

describe('i18n catalogues', () => {
  it('registers every namespace in both languages', () => {
    for (const ns of NAMESPACES) {
      expect(Object.keys(en)).toContain(ns);
      expect(Object.keys(es)).toContain(ns);
    }
  });

  it.each(AUTHORED_NAMESPACES)('%s has identical keys in en and es', (ns) => {
    const enKeys = Object.keys((en as unknown as Catalogue)[ns]).sort();
    const esKeys = Object.keys((es as unknown as Catalogue)[ns]).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it.each(AUTHORED_NAMESPACES)('%s uses the same ICU arguments in en and es', (ns) => {
    const enNs = (en as unknown as Catalogue)[ns];
    const esNs = (es as unknown as Catalogue)[ns];
    for (const [key, enMessage] of Object.entries(enNs)) {
      const esMessage = esNs[key];
      if (typeof enMessage !== 'string' || typeof esMessage !== 'string') continue;
      // An argument the translation drops is a value that silently never renders.
      expect({ key, args: [...icuArguments(esMessage)].sort() }).toEqual({
        key,
        args: [...icuArguments(enMessage)].sort(),
      });
    }
  });

  it('has no empty strings', () => {
    for (const lang of [en, es] as unknown as Catalogue[]) {
      for (const [ns, messages] of Object.entries(lang)) {
        for (const [key, value] of Object.entries(messages)) {
          expect(`${ns}:${key}=${String(value).trim()}`).not.toMatch(/=$/);
        }
      }
    }
  });

  it('translates the whole controlled vocabulary in both languages (AGENTS.md #13)', () => {
    const enVocab = Object.keys(en.vocab).sort();
    const esVocab = Object.keys(es.vocab).sort();
    expect(esVocab).toEqual(enVocab);
    expect(enVocab.length).toBeGreaterThan(0);
    // The universal emergency set (docs/10 §4) must be present — the Result screen renders it
    // for every toxic verdict, and a missing id there is an empty "What to do now".
    for (const id of ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging']) {
      expect(enVocab).toContain(`emergency_actions.${id}`);
      expect(esVocab).toContain(`emergency_actions.${id}`);
    }
  });
});
