"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

type BranchCacheOptions<T> = {
  resource: string;
  branchId: number | null | undefined;
  cacheParts?: Array<string | number | boolean | null | undefined>;
  enabled?: boolean;
  fetcher: (signal: AbortSignal) => Promise<T>;
};

const branchResourceCache = new Map<string, CacheEntry<unknown>>();

export function createBranchResourceCacheKey(
  resource: string,
  branchId: number | null | undefined,
  cacheParts: Array<string | number | boolean | null | undefined> = [],
) {
  const normalizedParts = cacheParts.map((part) => String(part ?? "all")).join("-");
  return `${resource}-${branchId ?? "none"}-${normalizedParts}`;
}

export function invalidateBranchResourceCache(resource: string, branchId?: number | null) {
  for (const key of branchResourceCache.keys()) {
    if (branchId === undefined || branchId === null) {
      if (key.startsWith(`${resource}-`)) {
        branchResourceCache.delete(key);
      }
      continue;
    }

    if (key.startsWith(`${resource}-${branchId}-`)) {
      branchResourceCache.delete(key);
    }
  }
}

export function useBranchResourceCache<T>({
  resource,
  branchId,
  cacheParts = [],
  enabled = true,
  fetcher,
}: BranchCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const cachePartKey = cacheParts.map((part) => String(part ?? "all")).join("-");
  const cacheKey = useMemo(
    () => createBranchResourceCacheKey(resource, branchId, [cachePartKey]),
    [branchId, cachePartKey, resource],
  );

  const refetch = useCallback(
    async (mode: "foreground" | "background" = "foreground") => {
      if (!enabled || !branchId) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return null;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (mode === "foreground") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const result = await fetcher(controller.signal);

        if (requestIdRef.current === requestId && !controller.signal.aborted) {
          branchResourceCache.set(cacheKey, { data: result, updatedAt: Date.now() });
          setData(result);
        }

        return result;
      } catch (err) {
        if (controller.signal.aborted) {
          return null;
        }

        if (requestIdRef.current === requestId) {
          setError(err);
        }

        return null;
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [branchId, cacheKey, enabled, fetcher],
  );

  useEffect(() => {
    if (!enabled || !branchId) {
      requestIdRef.current += 1;
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const cached = branchResourceCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      void refetch("background");
      return () => {
        controllerRef.current?.abort();
      };
    }

    setData(null);
    void refetch("foreground");

    return () => {
      controllerRef.current?.abort();
    };
  }, [branchId, cacheKey, enabled, refetch]);

  const invalidate = useCallback(() => {
    if (branchId) {
      invalidateBranchResourceCache(resource, branchId);
    }
  }, [branchId, resource]);

  return {
    data,
    loading,
    refreshing,
    error,
    setData,
    setError,
    refetch,
    invalidate,
  };
}
