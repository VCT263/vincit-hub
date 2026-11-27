import TopBar from "@/components/TopBar";
import DesignNav from "@/components/design/DesignNav";
export const metadata = { title: "Design · VINCIT HUB" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen">
      <TopBar />
      <DesignNav />
      <main className="lg:pl-60 print:pl-0">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-5 sm:py-8 md:py-10 print:p-0 print:max-w-none">{children}</div>
      </main>
    </div>
  );
}
