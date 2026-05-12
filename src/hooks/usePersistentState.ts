import { useEffect, useState } from 'react';

export function usePersistentState<T>(
  key: string,
  initialValue: T
) {

  const [value, setValue] = useState<T>(() => {

    try {

      const saved = localStorage.getItem(key);

      if (saved !== null) {
        return JSON.parse(saved);
      }

      return initialValue;

    } catch {

      return initialValue;

    }

  });

  useEffect(() => {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  }, [key, value]);

  return [value, setValue] as const;
}

