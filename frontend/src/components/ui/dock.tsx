import type { ReactNode } from "react";

/** Semantic workspace navigation with stable, full-size link targets. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <nav id="main-navigation" aria-label="Main navigation">
      {children}
    </nav>
  );
}
