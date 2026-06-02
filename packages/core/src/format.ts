// ============================================================
// Cash Pro v2 — Formatting utilities (locale-aware)
// ============================================================

const DEFAULT_LOCALE = "es";
const DEFAULT_CURRENCY = "USD";

// Runtime-configurable display defaults (set once from company settings).
let _config: { currency: string; locale: string } = {
  currency: DEFAULT_CURRENCY,
  locale: "es-VE",
};

/** Override the default currency/locale used by currency() across the app. */
export function setCurrencyConfig(config: Partial<{ currency: string; locale: string }>) {
  _config = { ..._config, ...config };
}

export function getCurrencyConfig() {
  return _config;
}

export function currency(
  n: number,
  currencyCode: string = _config.currency,
  locale: string = _config.locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(n);
}

/** Formats a ratio (0..1) as a percent string, e.g. 0.42 -> "42.0%". */
export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Formats an already-computed percentage value (0..100). */
export function pctValue(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function shortDate(iso: string, locale: string = DEFAULT_LOCALE): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

export function fullDate(iso: string, locale: string = DEFAULT_LOCALE): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
