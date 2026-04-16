import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * Explicitly tell Turbopack that the workspace root is THIS directory
   * (unibot-platform), not the parent `uni_system` directory which has a
   * stray package-lock.json that confused Turbopack's auto-detection.
   *
   * Without this, Turbopack resolves `tailwindcss` starting from `uni_system`
   * where it is NOT installed, causing:
   *   Error: Can't resolve 'tailwindcss' in '...uni_system'
   */
  turbopack: {
    root: process.cwd(),
  },
  /**
   * pdf-parse uses Node.js native modules internally.
   * Mark it as server-external so webpack/turbopack
   * does NOT bundle it — avoids module resolution errors.
   */
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
