import { normalizeHm } from './normalize-hm';

describe('normalizeHm', () => {
  it('pads single-digit hour', () => {
    expect(normalizeHm('8:00')).toBe('08:00');
  });

  it('keeps valid HH:mm', () => {
    expect(normalizeHm('08:30')).toBe('08:30');
  });

  it('rejects invalid values', () => {
    expect(normalizeHm('25:00')).toBeNull();
    expect(normalizeHm('abc')).toBeNull();
  });
});
