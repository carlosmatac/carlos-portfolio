"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { textMode: boolean; toggle: () => void };
const TextModeContext = createContext<Ctx | null>(null);

export function useTextMode() {
  const ctx = useContext(TextModeContext);
  if (!ctx) throw new Error("useTextMode must be used within TextModeProvider");
  return ctx;
}

export default function TextModeProvider({ children }: { children: React.ReactNode }) {
  const [textMode, setTextMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("textMode");
    if (saved) setTextMode(saved === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("textMode", textMode ? "1" : "0");
  }, [textMode]);

  const value = useMemo(
    () => ({ textMode, toggle: () => setTextMode(v => !v) }),
    [textMode]
  );

  return <TextModeContext.Provider value={value}>{children}</TextModeContext.Provider>;
}
