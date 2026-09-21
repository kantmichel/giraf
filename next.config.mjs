import { readFileSync } from "node:fs";

// package.json is the single source of truth for the version — release-please
// bumps it on every release, so the number in the UI follows automatically.
const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: {
    position: "bottom-right",
  },
  // Inlined at build time, so it reaches client components too.
  env: {
    APP_VERSION: version,
  },
}

export default nextConfig
