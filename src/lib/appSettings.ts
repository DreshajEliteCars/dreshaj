/**
 * App-wide runtime settings, editable from the admin dashboard.
 *
 * Currently only holds the flat shipping fee added on top of every
 * Encar listing's price. We keep this layer thin and singleton-shaped:
 * one row in `app_settings` (enforced by CHECK id = 1), one fetch on
 * page load, one update on save.
 */

import { getSupabase } from "./supabase";

export const DEFAULT_SHIP_PRICE_EUR = 1300;

export type AppSettings = {
  ship_price_eur: number;
};

/**
 * Read the singleton settings row via the server-side API proxy.
 * Falls back to defaults when the API is unavailable, so the public
 * site never crashes.
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return { ship_price_eur: DEFAULT_SHIP_PRICE_EUR };
    const data = await res.json();
    return {
      ship_price_eur:
        typeof data.ship_price_eur === "number"
          ? data.ship_price_eur
          : DEFAULT_SHIP_PRICE_EUR,
    };
  } catch {
    return { ship_price_eur: DEFAULT_SHIP_PRICE_EUR };
  }
}

/**
 * Update the ship price. Requires an authenticated session — RLS denies
 * anonymous writes. Returns the new value on success or throws.
 */
export async function updateShipPriceEur(value: number): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Ship price must be a non-negative integer");
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update({ ship_price_eur: value })
    .eq("id", 1)
    .select("ship_price_eur")
    .single();

  if (error) throw new Error(error.message);
  return data.ship_price_eur as number;
}

/**
 * Apply the ship-price surcharge to a raw `price_eur` value pulled
 * from the cars table. Null prices stay null (UI shows "contact for
 * price"). Used everywhere a car price is rendered.
 */
export function applyShipPrice(
  rawPriceEur: number | null,
  shipPriceEur: number
): number | null {
  if (rawPriceEur == null) return null;
  return rawPriceEur + shipPriceEur;
}
