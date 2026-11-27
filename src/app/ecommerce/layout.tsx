import TopBar from "@/components/TopBar";
import EcommerceNav from "@/components/ec/EcommerceNav";
export const metadata = { title: "E-commerce · VINCIT HUB" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen">
      <TopBar />
      <EcommerceNav />
      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-5 sm:py-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
