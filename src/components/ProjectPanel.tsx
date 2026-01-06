"use client";

import React from "react";
import { useTextMode } from "@/components/TextModeProvider";

export default function ProjectPanel({ children }: { children: React.ReactNode }) {
  const { textMode } = useTextMode();

  return (
    <div className="mx-auto max-w-5xl">
      <div
        className={[
          "rounded-[22px] border bg-black/[0.02]",
          textMode 
            ? "border-[rgba(var(--line),0.08)] p-4 md:p-5" 
            : "border-[rgba(var(--line),0.16)] p-5 md:p-6",
        ].join(" ")}
      >
        <div
          className={[
            "rounded-[18px] border bg-[rgb(var(--bg))]",
            textMode 
              ? "border-[rgba(var(--line),0.06)] p-2 md:p-3" 
              : "border-[rgba(var(--line),0.10)] p-6",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
