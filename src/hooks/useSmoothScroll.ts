"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

export function useSmoothScroll() {
    const pathname = usePathname();
    const router = useRouter();

    const scrollToSection = useCallback(
        (sectionId: string) => {
            // If we're on the home page, scroll to section
            if (pathname === "/") {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                    // Update URL without reload
                    window.history.pushState({}, "", `/#${sectionId}`);
                }
            } else {
                // If on another page, navigate to home with hash
                router.push(`/#${sectionId}`);
            }
        },
        [pathname, router]
    );

    const scrollToTop = useCallback(() => {
        if (pathname === "/") {
            window.scrollTo({ top: 0, behavior: "smooth" });
            window.history.pushState({}, "", "/");
        } else {
            router.push("/");
        }
    }, [pathname, router]);

    return { scrollToSection, scrollToTop };
}
