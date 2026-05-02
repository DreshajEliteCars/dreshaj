"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import styles from "./page.module.css";

interface ConditionItem {
  code: string;
  name: string;
  result: string;
  resultCode: string | null;
}

interface ConditionResponse {
  vehicleId: number;
  items: ConditionItem[];
}

const EXTERNAL_PANEL_NAMES = [
  "HOOD", "FRONT_FENDER_LEFT", "FRONT_FENDER_RIGHT", 
  "FRONT_DOOR_LEFT", "FRONT_DOOR_RIGHT", "BACK_DOOR_LEFT", "BACK_DOOR_RIGHT", 
  "TRUNK_LID", "ROOF", "QUARTER_PANEL_LEFT", "QUARTER_PANEL_RIGHT", "SIDE_SILL_LEFT", "SIDE_SILL_RIGHT"
];

const PANEL_TRANSLATIONS: Record<string, string> = {
  "FRONT_DOOR_LEFT": "panel_front_door_left",
  "BACK_DOOR_LEFT": "panel_back_door_left",
  "TRUNK_LID": "panel_trunk_lid",
  "BACK_DOOR_RIGHT": "panel_back_door_right",
  "FRONT_DOOR_RIGHT": "panel_front_door_right",
  "HOOD": "panel_hood",
  "FRONT_FENDER_RIGHT": "panel_front_fender_right",
  "FRONT_FENDER_LEFT": "panel_front_fender_left",
  "ROOF": "panel_roof",
  "QUARTER_PANEL_LEFT": "panel_quarter_panel_left",
  "QUARTER_PANEL_RIGHT": "panel_quarter_panel_right",
  "SIDE_SILL_LEFT": "panel_side_sill_left",
  "SIDE_SILL_RIGHT": "panel_side_sill_right",
};

function formatName(name: string) {
  return name.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function VehicleCondition({ carId, sourceId }: { carId: string; sourceId: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<ConditionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/cars/${encodeURIComponent(carId)}/condition`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        if (json.condition) {
          setData(json.condition);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [carId]);

  if (loading) {
    return (
      <section className={styles.inspectionCard}>
        <div className={styles.inspLoading}>{t("loading")}</div>
      </section>
    );
  }

  if (error || !data || !data.items || data.items.length === 0) {
    return null;
  }

  const isAccidentFree = data.items.some(
    (item) => item.name.includes("COMMENT") && item.result.includes("무사고")
  );

  const frameItems = data.items.filter(i => !i.name.includes("COMMENT") && !EXTERNAL_PANEL_NAMES.includes(i.name));
  const externalItems = data.items.filter(i => !i.name.includes("COMMENT") && EXTERNAL_PANEL_NAMES.includes(i.name));

  return (
    <section className={styles.inspectionCard}>
      <div className={styles.optionsHeader} style={{ marginBottom: 24 }}>
        <h2 className={styles.optionsTitle}>{t("vehicle_condition")}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Frame Items */}
        {frameItems.length > 0 && (
          <div>
            <h3 className={styles.inspSubheading} style={{ marginTop: 0, marginBottom: 16 }}>{t("frame_diagnostic_items")}</h3>
            <div className={styles.inspFactList}>
              {frameItems.map(item => {
                const labelKey = PANEL_TRANSLATIONS[item.name];
                const displayName = labelKey ? t(labelKey) : formatName(item.name);
                return (
                  <div key={item.code} className={styles.inspFactRow}>
                    <dt>{displayName}</dt>
                    <dd>
                      <span className={item.resultCode === 'NORMAL' ? styles.inspBadge_ok : styles.inspBadge_bad}>
                        {item.resultCode === 'NORMAL' ? t("normal") : t("review")}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* External Items */}
        {externalItems.length > 0 && (
          <div>
            <h3 className={styles.inspSubheading} style={{ marginTop: 0, marginBottom: 16 }}>{t("external_panel_diagnostic_items")}</h3>
            <div className={styles.inspFactList}>
              {externalItems.map(item => {
                const labelKey = PANEL_TRANSLATIONS[item.name];
                const displayName = labelKey ? t(labelKey) : formatName(item.name);
                return (
                  <div key={item.code} className={styles.inspFactRow}>
                    <dt>{displayName}</dt>
                    <dd>
                      <span className={item.resultCode === 'NORMAL' ? styles.inspBadge_ok : styles.inspBadge_bad}>
                        {item.resultCode === 'NORMAL' ? t("normal") : t("review")}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
