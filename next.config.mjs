import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin Turbopack to this project so it doesn't accidentally pick a
  // parent lockfile (npm root in C:\Users\leeo\package-lock.json) as
  // the workspace root and emit a warning on every build.
  turbopack: {
    root: __dirname,
  },
  // Allow remote car photos served by Encar's CDN and Supabase storage
  // through next/image. We currently use plain <img>, but adding this
  // up-front means swapping to next/image later is a one-line change.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ci.encar.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
