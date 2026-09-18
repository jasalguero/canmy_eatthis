import { describe, expect, it } from 'vitest';
import { normalise } from './normalise.js';

describe('normalise', () => {
  it('lowercases', () => {
    expect(normalise('Chocolate')).toBe('chocolate');
    expect(normalise('DARK CHOCOLATE')).toBe('dark chocolate');
  });

  it('strips punctuation', () => {
    expect(normalise("dark-chocolate!")).toBe('dark chocolate');
    expect(normalise('¿chocolate?')).toBe('chocolate');
  });

  it('collapses whitespace', () => {
    expect(normalise('dark   chocolate\n\tbar')).toBe('dark chocolate bar');
    expect(normalise('  padded  ')).toBe('padded');
  });

  it('singularises a trailing s', () => {
    expect(normalise('grapes')).toBe('grape');
    expect(normalise('grape')).toBe('grape');
    expect(normalise('raisins')).toBe('raisin');
  });

  it('folds Spanish accents and diacritics', () => {
    expect(normalise('limón')).toBe('limon');
    expect(normalise('piña')).toBe('pina');
    expect(normalise('xilitol')).toBe('xilitol');
    expect(normalise('José')).toBe('jose');
  });

  it('folds ñ to n', () => {
    expect(normalise('piña')).toBe('pina');
    expect(normalise('Año')).toBe('ano');
  });

  it('folds ü to u', () => {
    expect(normalise('pingüino')).toBe('pinguino');
  });

  it('handles combined accents, case and plurals together', () => {
    expect(normalise('Cebollas')).toBe('cebolla');
    expect(normalise('UVAS')).toBe('uva');
    expect(normalise('Plátanos')).toBe('platano');
  });

  it('is idempotent', () => {
    const once = normalise('  Dark-Chocolate Bar!! ');
    expect(normalise(once)).toBe(once);
  });
});
