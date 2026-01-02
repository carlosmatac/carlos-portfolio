"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type TextModeCtx = {
  textMode: boolean;
  toggle: () => void;
  setTextMode: (v: boolean) => void;
};

const Ctx = createContext<TextModeCtx | null>(null);

export function TextModeProvider({ children }: { children: React.ReactNode }) {
  const [textMode, setTextMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("cm:textMode");
    if (saved === "1") setTextMode(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cm:textMode", textMode ? "1" : "0");
  }, [textMode]);

  const value = useMemo(
    () => ({
      textMode,
      setTextMode,
      toggle: () => setTextMode((v) => !v),
    }),
    [textMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTextMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTextMode must be used within TextModeProvider");
  return ctx;
}
