import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (default 500ms).
 * Returns the debounced value that only updates after the user stops typing.
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
