"use client";

import { useEffect } from "react";
import { setCurrencyConfig } from "@cash-pro/core";
import { useSettings } from "@/lib/queries";

const KEY = "cashpro-currency";

// Apply the last-known currency synchronously on the client so the first
// paint already uses the right currency for returning users.
if (typeof window !== "undefined") {
  const cached = window.localStorage.getItem(KEY);
  if (cached) setCurrencyConfig({ currency: cached });
}

/** Keeps the core currency formatter in sync with company settings. */
export function CurrencySync() {
  const { data } = useSettings();
  useEffect(() => {
    if (data?.currency) {
      setCurrencyConfig({ currency: data.currency });
      window.localStorage.setItem(KEY, data.currency);
    }
  }, [data?.currency]);
  return null;
}
