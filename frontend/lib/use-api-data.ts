"use client";

import { useEffect, useState } from "react";

export function useApiData<T>(loader: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loader()
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
          setData(fallback);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // The loader/fallback values are intentionally captured on mount for page-level data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, setData, loading, error, setError };
}
