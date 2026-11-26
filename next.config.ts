import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    // 01 Operação do Gestor foi para Seu dia
    return [
      { source: "/agency/tarefas", destination: "/tarefas", permanent: false },
      { source: "/agency/agenda", destination: "/agenda", permanent: false },
      { source: "/agency/projetos", destination: "/tarefas?view=projetos", permanent: false },
      { source: "/agency/projetos/:id", destination: "/projetos/:id", permanent: false },
      // a aba Skills do Audiovisual virou Ferramentas
      { source: "/audiovisual/skills", destination: "/audiovisual/ferramentas", permanent: false },
      { source: "/audiovisual/skills/:path*", destination: "/audiovisual/ferramentas/:path*", permanent: false },
    ];
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
