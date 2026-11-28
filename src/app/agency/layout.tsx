import TopBar from "@/components/TopBar";
import AgencyNav from "@/components/agency/AgencyNav";
import OlhoValores from "@/components/agency/OlhoValores";

export const metadata = { title: "Gestor · VINCIT HUB" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen">
      <TopBar />
      <AgencyNav />
      <main className="lg:pl-60" data-gestor>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-5 sm:py-8 md:py-10">{children}</div>
      </main>
      <OlhoValores />
    </div>
  );
}
