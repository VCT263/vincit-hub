"use client";
import PageHead from "@/components/PageHead";
import PostScheduler from "@/components/creator/PostScheduler";

export default function Agendar() {
  return (
    <>
      <PageHead kicker="CREATOR · 03 PUBLICAÇÃO" title="Agendar publicações" desc="Calendário de posts, carrosséis, Reels e Stories. O HUB publica no horário marcado e o card do Quadro passa para Publicado, com a análise de 7 dias depois." />
      <PostScheduler />
    </>
  );
}
