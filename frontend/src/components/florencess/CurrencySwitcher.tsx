"use client";

import { useState } from "react";
import { useRegion } from "@/lib/providers";
import { currencyLabel } from "@/lib/lorencess-region";

/**
 * Currency picker backed by store regions (currency belongs to a region in
 * Medusa). Only regions that actually exist are offered; with a single region
 * the current currency is shown as plain text, and when the region list cannot
 * be loaded the whole switcher hides.
 */
export default function CurrencySwitcher({ surface = "header" }: { surface?: "header" | "footer" | "drawer" }) {
  const { region, regions, selectRegion, regionSwitching, regionNotice, clearRegionNotice } = useRegion();
  const [error, setError] = useState<string | null>(null);

  if (!regions.length) return null;

  if (regions.length === 1) {
    return region ? (
      <span className={`fl-currency fl-currency--${surface}`}>{currencyLabel(region.currency_code)}</span>
    ) : null;
  }

  return (
    <span className={`fl-currency fl-currency--${surface}`}>
      <label className="fl-currency__field">
        <span className="fl-currency__label">Currency</span>
        <select
          aria-label="Currency"
          value={region?.id ?? ""}
          disabled={regionSwitching}
          onChange={async (event) => {
            setError(null);
            clearRegionNotice();
            const next = event.currentTarget.value;
            try {
              await selectRegion(next);
            } catch {
              setError("This currency could not be selected. Please try again.");
            }
          }}
        >
          {regions.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {currencyLabel(entry.currency_code)}
            </option>
          ))}
        </select>
      </label>
      {regionNotice ? (
        <span role="status" className="fl-currency__notice">
          {regionNotice}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="fl-currency__notice">
          {error}
        </span>
      ) : null}
    </span>
  );
}
