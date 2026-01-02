import Header from "@/components/Header";
import RouteTransition from "@/components/RouteTransition";
import TextModeProvider from "@/components/TextModeProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <TextModeProvider>
      <Header />
      <RouteTransition>{children}</RouteTransition>
    </TextModeProvider>
  );
}
