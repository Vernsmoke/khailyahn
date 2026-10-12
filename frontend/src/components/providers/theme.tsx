"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { ToggleTheme } from "@/components/ui/toggle-theme";

function ThemeCookie() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    document.cookie = `gym-theme=${resolvedTheme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({
  initialTheme,
  nonce,
  children,
}: {
  initialTheme: "light" | "dark";
  nonce?: string;
  children: ReactNode;
}) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      storageKey="gym-theme-preference"
      defaultTheme={initialTheme}
      enableSystem
      nonce={nonce}
    >
      <ThemeCookie />
      {children}
    </NextThemeProvider>
  );
}

export function ThemeToggle() {
  return <ToggleTheme />;
}
