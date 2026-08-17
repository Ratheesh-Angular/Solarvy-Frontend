import { useCallback, useEffect, useRef, useState } from "react";

const PENDING_CAP = 92;
const FINISH_MS = 350;
const HOLD_AT_100_MS = 180;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useSyncedProgress(busy: boolean, expectedMs: number) {
  const [open, setOpen] = useState(busy);
  const [progress, setProgress] = useState(1);

  const rafRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const phaseRef = useRef<"idle" | "pending" | "finishing">(
    busy ? "pending" : "idle",
  );
  const currentProgressRef = useRef(1);
  const expectedMsRef = useRef(expectedMs);
  const finishResolversRef = useRef<Array<() => void>>([]);

  expectedMsRef.current = expectedMs;

  const cancelTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const flushResolvers = useCallback(() => {
    const resolvers = finishResolversRef.current;
    finishResolversRef.current = [];
    resolvers.forEach((resolve) => resolve());
  }, []);

  const tickPending = useCallback((now: number) => {
    const elapsed = now - startTimeRef.current;
    const tau = Math.max(200, expectedMsRef.current);
    const next = Math.min(
      PENDING_CAP,
      1 + 91 * (1 - Math.exp(-elapsed / tau)),
    );
    currentProgressRef.current = next;
    setProgress(Math.max(1, Math.round(next)));
    rafRef.current = requestAnimationFrame(tickPending);
  }, []);

  const startPending = useCallback(() => {
    cancelTimers();
    phaseRef.current = "pending";
    startTimeRef.current = performance.now();
    currentProgressRef.current = 1;
    setProgress(1);
    setOpen(true);
    rafRef.current = requestAnimationFrame(tickPending);
  }, [cancelTimers, tickPending]);

  const finishLoader = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (phaseRef.current === "idle") {
        resolve();
        return;
      }

      finishResolversRef.current.push(resolve);
      if (phaseRef.current === "finishing") return;

      cancelTimers();
      phaseRef.current = "finishing";
      const from = currentProgressRef.current;
      const startedAt = performance.now();

      const tickFinish = (now: number) => {
        const t = Math.min(1, (now - startedAt) / FINISH_MS);
        const next = from + (100 - from) * easeOutCubic(t);
        currentProgressRef.current = next;
        setProgress(Math.max(1, Math.round(next)));

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tickFinish);
          return;
        }

        setProgress(100);
        holdTimerRef.current = window.setTimeout(() => {
          holdTimerRef.current = null;
          phaseRef.current = "idle";
          setOpen(false);
          setProgress(1);
          currentProgressRef.current = 1;
          flushResolvers();
        }, HOLD_AT_100_MS);
      };

      rafRef.current = requestAnimationFrame(tickFinish);
    });
  }, [cancelTimers, flushResolvers]);

  const abortLoader = useCallback(() => {
    cancelTimers();
    phaseRef.current = "idle";
    setOpen(false);
    setProgress(1);
    currentProgressRef.current = 1;
    flushResolvers();
  }, [cancelTimers, flushResolvers]);

  useEffect(() => {
    if (!busy) {
      if (phaseRef.current === "pending") {
        void finishLoader();
      }
      return;
    }

    startPending();
    return () => {
      if (phaseRef.current === "pending") {
        cancelTimers();
      }
    };
  }, [busy, cancelTimers, finishLoader, startPending]);

  useEffect(() => () => cancelTimers(), [cancelTimers]);

  return { open, progress, finishLoader, abortLoader };
}
