/**
 * React hook that exposes the current shipping fee from `app_settings`.
 * Returns the default while the value is loading so the page never has
 * to render "loading" just for a price label.
 */
"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SHIP_PRICE_EUR, getAppSettings } from "./appSettings";

export function useShipPrice(): number {
  const [shipPrice, setShipPrice] = useState<number>(DEFAULT_SHIP_PRICE_EUR);

  useEffect(() => {
    let cancelled = false;
    getAppSettings()
      .then((settings) => {
        if (!cancelled) setShipPrice(settings.ship_price_eur);
      })
      .catch(() => {
        // Network error or RLS issue — stick with the default so the
        // public site keeps rendering reasonable prices.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return shipPrice;
}
