import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tesla-light-show/shared", "three", "@react-three/fiber", "@react-three/drei"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
