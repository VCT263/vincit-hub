import type { MetadataRoute } from "next";

/** HUB instalável (tela inicial do celular e Dock do Mac) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VINCIT HUB",
    short_name: "VINCIT",
    description: "Seu dia, Creator e Gestor da VINCIT",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0c0d",
    theme_color: "#0c0c0d",
    lang: "pt-BR",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tarefas", url: "/tarefas" },
      { name: "Agenda", url: "/agenda" },
      { name: "Rotina", url: "/rotina" },
    ],
  };
}
