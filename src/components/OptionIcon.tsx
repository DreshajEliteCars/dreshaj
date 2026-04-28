import type { OptionIconKey } from "../lib/carOptions";

/**
 * Small set of inline SVG icons used in the car-detail Major Options
 * grid. Adding a new icon: extend OptionIconKey in carOptions.ts and
 * add a case here.
 */
export default function OptionIcon({
  name,
  size = 28,
}: {
  name: OptionIconKey;
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      );
    case "lightbulb":
      return (
        <svg {...props}>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z" />
        </svg>
      );
    case "fog":
      return (
        <svg {...props}>
          <path d="M3 8h18M3 12h18M3 16h12M3 20h18" />
        </svg>
      );
    case "car":
      return (
        <svg {...props}>
          <path d="M5 17h14M5 17l1-5 2-5h8l2 5 1 5M5 17v3M19 17v3" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "key":
      return (
        <svg {...props}>
          <circle cx="8" cy="15" r="4" />
          <path d="M10.85 12.15L19 4M15 8l3 3M19 5l2 2" />
        </svg>
      );
    case "power":
      return (
        <svg {...props}>
          <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
        </svg>
      );
    case "armchair":
      return (
        <svg {...props}>
          <path d="M19 9V6a3 3 0 00-3-3H8a3 3 0 00-3 3v3M3 14a3 3 0 013-3h12a3 3 0 013 3v4H3v-4zM5 18v3M19 18v3" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
        </svg>
      );
    case "wind":
      return (
        <svg {...props}>
          <path d="M9.59 4.59A2 2 0 1111 8H2M12.59 11.41A2 2 0 1014 15H2M17.73 7.73A2.5 2.5 0 1119.5 12H2" />
        </svg>
      );
    case "snowflake":
      return (
        <svg {...props}>
          <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M19.07 4.93L4.93 19.07" />
        </svg>
      );
    case "gauge":
      return (
        <svg {...props}>
          <path d="M12 14l4-4M3 12a9 9 0 0118 0" />
          <circle cx="12" cy="14" r="1" />
        </svg>
      );
    case "route":
      return (
        <svg {...props}>
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "camera":
      return (
        <svg {...props}>
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "parking":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 17V7h4a3 3 0 010 6H9" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "map":
    case "navigation":
      return (
        <svg {...props}>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      );
    case "music":
      return (
        <svg {...props}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "battery":
      return (
        <svg {...props}>
          <rect x="2" y="7" width="18" height="10" rx="2" />
          <line x1="22" y1="11" x2="22" y2="13" />
          <line x1="6" y1="11" x2="6" y2="13" />
          <line x1="10" y1="11" x2="10" y2="13" />
        </svg>
      );
    case "wheel":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="22" />
          <line x1="2" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "rain":
      return (
        <svg {...props}>
          <path d="M16 13a4 4 0 100-8 5.5 5.5 0 00-10.5 1.5A4.5 4.5 0 007 14" />
          <line x1="8" y1="19" x2="8" y2="21" />
          <line x1="12" y1="19" x2="12" y2="21" />
          <line x1="16" y1="19" x2="16" y2="21" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01A1.65 1.65 0 009 3.09V3a2 2 0 014 0v.09c0 .68.4 1.29 1.01 1.51a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.46.46-.6 1.16-.33 1.82.27.6.88 1 1.51 1H21a2 2 0 110 4h-.09c-.68 0-1.29.4-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}
