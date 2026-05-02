"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SHIP_PRICE_EUR,
  getAppSettings,
  updateShipPriceEur,
} from "../lib/appSettings";

/**
 * Admin-only widget that lives on /dashboard. Shows the current flat
 * shipping fee (added on top of every Encar listing's price) and lets
 * the admin save a new value. Saves go through the `app_settings`
 * table; RLS makes sure only authenticated users can update.
 */
export default function AppSettingsManager() {
  const [shipPrice, setShipPrice] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    getAppSettings()
      .then((settings) => {
        if (cancelled) return;
        setShipPrice(settings.ship_price_eur);
        setDraft(String(settings.ship_price_eur));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const value = Number.parseInt(draft, 10);
    if (!Number.isInteger(value) || value < 0) {
      setMessage({
        kind: "error",
        text: "Ju lutem shkruani një numër të vlefshëm (≥ 0).",
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await updateShipPriceEur(value);
      setShipPrice(saved);
      setDraft(String(saved));
      setMessage({
        kind: "success",
        text: `Çmimi i anijes u ruajt: € ${saved.toLocaleString("en-US")}.`,
      });
    } catch (err: unknown) {
      setMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Ruajtja dështoi. Provo përsëri.",
      });
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    shipPrice != null && Number.parseInt(draft, 10) !== shipPrice;

  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
        Cilësimet e platformës
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: 20,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Çmimi i anijes shtohet automatikisht mbi çmimin e secilit kerr të
        listuar. Çmimi përfundimtar = çmimi nga Encar + tarifa e markup-it
        (€400–€700 sipas vlerës) + çmimi i anijes.
      </p>

      <form
        onSubmit={handleSave}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Çmimi i anijes (EUR)
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              maxWidth: 320,
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 18 }}>€</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading || saving}
              placeholder={String(DEFAULT_SHIP_PRICE_EUR)}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 500,
              }}
            />
          </div>
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={loading || saving || !dirty}
            style={{
              padding: "10px 20px",
              backgroundColor: dirty ? "#0d6efd" : "#9ca3af",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: dirty && !saving ? "pointer" : "not-allowed",
              fontWeight: 600,
              transition: "background-color 0.15s",
            }}
          >
            {saving ? "Duke ruajtur…" : "Ruaj"}
          </button>
          {shipPrice != null && (
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              Aktualisht: € {shipPrice.toLocaleString("en-US")}
            </span>
          )}
        </div>

        {message && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 14,
              background:
                message.kind === "success" ? "#d1fae5" : "#fee2e2",
              color: message.kind === "success" ? "#065f46" : "#991b1b",
            }}
          >
            {message.text}
          </div>
        )}
      </form>
    </section>
  );
}
