"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

// o Excalidraw só roda no navegador
// fontes servidas pelo próprio HUB (public/excalidraw); o CDN fica de reserva (ex.: fontes chinesas)
const BrainstormEditor = dynamic(() => {
  (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw/";
  return import("@/components/creator/BrainstormEditor");
}, {
  ssr: false,
  loading: () => <div className="fixed inset-x-0 top-16 bottom-0 z-40 grid place-items-center bg-ink text-fog text-sm">Abrindo o quadro…</div>,
});

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  return <BrainstormEditor id={id} />;
}
