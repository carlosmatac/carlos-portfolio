import Header from "@/components/Header";
import { TextModeProvider } from "@/components/TextModeProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <TextModeProvider>
      <Header />
      {children}
    </TextModeProvider>
  );
}

