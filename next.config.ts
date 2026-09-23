import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Permitir el origen del panel de vista previa en desarrollo
  allowedDevOrigins: ["preview-chat-5e46259e-0b5c-4299-93fd-0aed763f2fe0.space-z.ai"],
};

export default nextConfig;
