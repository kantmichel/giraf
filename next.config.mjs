/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: {
    position: "bottom-right",
  },
}

export default nextConfig
