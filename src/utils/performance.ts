/**
 * Performance utilities for ResultBoard.
 * Provides debounce, throttle, and memoize functions for expensive operations.
 * Used by sync, search filtering, and DOM observation in the content script.
 */

export interface Cancelable {
  cancel(): void;
}

/**
 * Creates a debounced function that delays invoking `fn` until after `ms`
 * milliseconds have elapsed since the last time it was invoked.
 * The debounced function has a `cancel` method to cancel any pending invocation.
 */
export function debounce<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  ms: number
): ((...args: Args) => Result) & Cancelable {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Args) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args);
    }, ms);
  } as unknown as ((...args: Args) => Result) & Cancelable;

  (debounced as unknown as Cancelable).cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes `fn` at most once per `ms` milliseconds.
 * Uses trailing edge: if called during the throttle window, the last call is queued.
 * The throttled function has a `cancel` method to cancel any pending trailing invocation.
 */
export function throttle<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  ms: number
): ((...args: Args) => Result) & Cancelable {
  let lastCallTime = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;
  let lastThis: unknown = null;

  const invoke = () => {
    lastCallTime = Date.now();
    if (lastArgs !== null) {
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
  };

  const throttled = function (this: unknown, ...args: Args) {
    const now = Date.now();
    const remaining = ms - (now - lastCallTime);

    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      invoke();
    } else if (timerId === null) {
      timerId = setTimeout(() => {
        timerId = null;
        invoke();
      }, remaining);
    }
  } as unknown as ((...args: Args) => Result) & Cancelable;

  (throttled as unknown as Cancelable).cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Creates a memoized version of a function.
 * Results are cached by key. An optional `keyFn` computes the cache key from arguments.
 * Defaults to JSON.stringify of the arguments.
 */
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  keyFn?: (...args: Args) => string
): (...args: Args) => Result {
  const cache = new Map<string, Result>();

  const defaultKey = (args: Args): string => JSON.stringify(args, (_key, value: unknown) => {
    if (value === undefined) return { __resultboardType: 'undefined' };
    if (typeof value === 'number' && Number.isNaN(value)) return { __resultboardType: 'nan' };
    return value;
  });

  const memoized = function (this: unknown, ...args: Args): Result {
    const key = keyFn ? keyFn(...args) : defaultKey(args);
    if (cache.has(key)) {
      return cache.get(key) as Result;
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return memoized;
}
