import Header from "@/components/Header";
import { TextModeProvider } from "@/components/TextModeProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TextModeProvider>
        <Header />
        {children}
      </TextModeProvider>
    </ThemeProvider>
  );
}

