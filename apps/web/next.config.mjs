import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for a minimal Docker image (Cloud Run ready).
  output: "standalone",
  // Trace files from the monorepo root so workspace deps are included.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@cash-pro/core"],
};

export default nextConfig;
