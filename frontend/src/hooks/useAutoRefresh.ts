import { useState, useEffect, useCallback, useRef } from 'react';
import { FetchState } from '../types';

/**
 * Periodically fetches data from the given URL.
 * Returns FetchState so components can render loading / error / success states.
 */
export function useAutoRefresh<T>(
  url: string,
  intervalMs: number,
  enabled = true,
): FetchState<T> & { refresh: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) =>
      prev.status === 'success' ? prev : { status: 'loading' },
    );

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        // Try to extract a message from the error body, fall back to HTTP status
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch { /* ignore parse failure */ }
        throw new Error(detail);
      }
      const data: T = await res.json();
      setState({ status: 'success', data });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setState({ status: 'error', error: String(err) });
    }
  }, [url, enabled]);

  // Initial fetch + interval
  useEffect(() => {
    fetch_();
    if (intervalMs <= 0) return;
    const timer = setInterval(fetch_, intervalMs);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetch_, intervalMs]);

  return { ...state, refresh: fetch_ };
}

/** Simple interval hook — calls callback on a fixed interval (ms). */
export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
