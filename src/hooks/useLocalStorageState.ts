import { useEffect, useState } from "react";

export function useLocalStorageState(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : stored === "1";
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // ignore write failures (private browsing, storage disabled, etc.)
    }
  }, [key, value]);

  return [value, setValue] as const;
}
