"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useApi } from "@/hooks/use-api";

type Fees = { ANNUAL: number; MONTHLY: number };
export const STALE_FEE_MESSAGE =
  "The fee has changed. Review the latest price and confirm receipt again before saving.";

/** Keep the displayed quote stable until the operator explicitly reviews it. */
export function useFeeQuote() {
  const query = useApi<Fees>("fees");
  const [stale, setStale] = useState(false);
  const fees = query.data;
  useEffect(() => {
    if (!fees) return;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const current = await api<Fees>("fees", { signal: controller.signal });
        if (!controller.signal.aborted)
          setStale(
            current.ANNUAL !== fees!.ANNUAL ||
              current.MONTHLY !== fees!.MONTHLY,
          );
      } catch {
        /* The save preflight reports failures; retain the displayed quote. */
      }
    }
    const interval = setInterval(() => void check(), 30_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fees]);
  async function verify() {
    const current = await api<Fees>("fees");
    if (
      !fees ||
      current.ANNUAL !== fees.ANNUAL ||
      current.MONTHLY !== fees.MONTHLY
    ) {
      setStale(true);
      throw new Error(STALE_FEE_MESSAGE);
    }
  }
  return {
    ...query,
    stale,
    verify,
    review: () => {
      setStale(false);
      query.retry();
    },
  };
}
