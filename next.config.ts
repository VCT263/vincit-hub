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
  async rewrites() {
    // descoberta OAuth do conector do Claude (MCP)
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata?kind=resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/metadata?kind=resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata?kind=server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/metadata?kind=server" },
      { source: "/.well-known/openid-configuration", destination: "/api/oauth/metadata?kind=server" },
    ];
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
