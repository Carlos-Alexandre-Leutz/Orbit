import {
  acceptCorrelationId,
  currentCorrelationId,
  runWithCorrelation,
} from './correlation';

describe('correlation ID', () => {
  it('keeps a plain token from the caller', () => {
    expect(acceptCorrelationId('abc-123_DEF.45')).toBe('abc-123_DEF.45');
  });

  it.each([
    undefined,
    '',
    'short',
    'has space in it',
    'a'.repeat(65),
    'x\ny12345678',
  ])('replaces %p with a new ID', (raw) => {
    const id = acceptCorrelationId(raw);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('is visible only inside the request', () => {
    expect(currentCorrelationId()).toBeUndefined();
    runWithCorrelation('req-12345678', () => {
      expect(currentCorrelationId()).toBe('req-12345678');
    });
  });
});
