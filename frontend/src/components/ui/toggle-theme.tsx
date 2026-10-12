"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

export function ToggleTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button
      type="button"
      className="button theme-toggle"
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <div className="theme-toggle-glyph" data-dark={dark} aria-hidden="true">
        <Sun className="theme-sun" size={18} />
        <Moon className="theme-moon" size={18} />
      </div>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
