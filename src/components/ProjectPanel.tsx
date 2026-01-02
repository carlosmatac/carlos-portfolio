"use client";

import React from "react";
import { useTextMode } from "@/components/TextModeProvider";

export default function ProjectPanel({ children }: { children: React.ReactNode }) {
  const { textMode } = useTextMode();

  return (
    <div className="mx-auto max-w-5xl">
      <div
        className={[
          "rounded-[22px] border border-[rgba(var(--line),0.16)] bg-black/[0.02]",
          textMode ? "p-4 md:p-5" : "p-5 md:p-6",
        ].join(" ")}
      >
        <div
          className={[
            "rounded-[18px] border border-[rgba(var(--line),0.10)] bg-[rgb(var(--bg))]",
            textMode ? "p-2 md:p-3" : "p-6",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
