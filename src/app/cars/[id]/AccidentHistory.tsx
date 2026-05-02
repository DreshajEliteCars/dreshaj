"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import styles from "./page.module.css";

interface AccidentResponse {
  openData: boolean;
  myAccidentCnt: number;
  myAccidentCost: number;
  otherAccidentCnt: number;
  ownerChangeCnt: number;
  floodTotalLossCnt: number;
  floodPartLossCnt: number | null;
  totalLossCnt: number;
  accidentCnt: number;
}

export default function AccidentHistory({ carId }: { carId: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<AccidentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/cars/${encodeURIComponent(carId)}/accidents`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        if (json.data) {
          setData(json.data);
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
        <div className={styles.inspLoading}>{t("loading") || "Loading..."}</div>
      </section>
    );
  }

  if (error || !data || !data.openData) {
    return null;
  }

  const numberFormatter = new Intl.NumberFormat("en-US");

  return (
    <section className={styles.inspectionCard}>
      <div className={styles.optionsHeader} style={{ marginBottom: 24 }}>
        <h2 className={styles.optionsTitle}>{t("accident_history") || "Accident History"}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <dl className={styles.inspFactList}>
          <div className={styles.inspFactRow}>
            <dt>{t("owner_changes") || "Owner Changes"}</dt>
            <dd>
              <span className={styles.conditionValue}>
                {data.ownerChangeCnt}
              </span>
            </dd>
          </div>

          <div className={styles.inspFactRow}>
            <dt>{t("total_accidents") || "Total Accidents"}</dt>
            <dd>
              <span className={data.accidentCnt === 0 ? styles.inspBadge_ok : styles.inspBadge_bad}>
                {data.accidentCnt === 0 
                  ? (t("no_accidents") || "0") 
                  : `${data.accidentCnt}`}
              </span>
            </dd>
          </div>

          <div className={styles.inspFactRow}>
            <dt>{t("damage_to_my_car") || "Insurance accident history (damage to my car)"}</dt>
            <dd>
              <span className={data.myAccidentCnt === 0 ? styles.inspBadge_ok : styles.inspBadge_bad}>
                {data.myAccidentCnt === 0 
                  ? (t("insp_no") || "No")
                  : `${data.myAccidentCnt} ${t("times") || "times"} / €${numberFormatter.format(Math.round(data.myAccidentCost / 1450))}`}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
