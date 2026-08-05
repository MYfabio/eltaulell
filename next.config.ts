import type { NextConfig } from "next";

const constrainedRuntime = process.env.ELTAULELL_CONSTRAINED_RUNTIME === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  ...(constrainedRuntime
    ? {
        experimental: {
          cpus: 1,
          webpackBuildWorker: false,
          workerThreads: true,
        },
      }
    : {
        webpack(config: { cache?: unknown }, { dev }: { dev: boolean }) {
          if (dev) config.cache = false;
          return config;
        },
      }),
};

export default nextConfig;
