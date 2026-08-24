import BackgroundField from "@/components/BackgroundField";
import Header from "@/components/Header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundField />
      <Header />
      {children}
    </>
  );
}
