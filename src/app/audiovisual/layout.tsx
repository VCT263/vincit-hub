import TopBar from "@/components/TopBar";
import AudiovisualNav from "@/components/av/AudiovisualNav";
export const metadata = { title: "Audiovisual · VINCIT HUB" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen">
      <TopBar />
      <AudiovisualNav />
      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
