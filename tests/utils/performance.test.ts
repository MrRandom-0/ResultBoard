import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, memoize } from '../../src/utils/performance';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution by specified milliseconds', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only executes last call when called multiple times', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('resets timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() prevents pending execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes arguments correctly', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced(1, 'two', true);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(1, 'two', true);
  });

  it('can be called again after execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('first');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('first');

    debounced('second');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('second');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('throttles subsequent calls within the interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b');
    throttled('c');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('executes trailing call after interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('allows new call after interval passes', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    vi.advanceTimersByTime(100);
    throttled('second');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel() prevents pending trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b');
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('only fires trailing once even with many calls in interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled(1);
    throttled(2);
    throttled(3);
    throttled(4);
    throttled(5);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(5);
  });

  it('handles rapid calls across multiple intervals', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    vi.advanceTimersByTime(100);
    throttled('b');
    vi.advanceTimersByTime(100);
    throttled('c');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('memoize', () => {
  it('caches results for same arguments', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('computes new result for different arguments', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('supports multiple arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(memoized(3, 4)).toBe(7);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses custom key function when provided', () => {
    const fn = vi.fn((obj: { id: string; value: number }) => obj.value * 2);
    const memoized = memoize(fn, (obj) => obj.id);

    expect(memoized({ id: 'a', value: 5 })).toBe(10);
    expect(memoized({ id: 'a', value: 99 })).toBe(10); // cached by id
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized({ id: 'b', value: 3 })).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns correct types', () => {
    const fn = (name: string): string => `Hello, ${name}!`;
    const memoized = memoize(fn);

    const result: string = memoized('World');
    expect(result).toBe('Hello, World!');
  });

  it('handles no-arg functions', () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return 42;
    };
    const memoized = memoize(fn);

    expect(memoized()).toBe(42);
    expect(memoized()).toBe(42);
    expect(callCount).toBe(1);
  });

  it('distinguishes between different falsy arguments', () => {
    const fn = vi.fn((x: unknown) => String(x));
    const memoized = memoize(fn);

    memoized(0);
    memoized(null);
    memoized(undefined);
    memoized('');
    memoized(false);

    expect(fn).toHaveBeenCalledTimes(5);
  });
});
