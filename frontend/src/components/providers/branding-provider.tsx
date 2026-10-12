"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

const BrandingContext = createContext({
  version: "",
  setVersion: (_version: string) => {
    void _version;
  },
});
export function BrandingProvider({
  initialVersion,
  children,
}: {
  initialVersion: string;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(initialVersion);
  return (
    <BrandingContext.Provider value={{ version, setVersion }}>
      {children}
    </BrandingContext.Provider>
  );
}
export const useBranding = () => useContext(BrandingContext);
export const logoUrl = (version: string) =>
  version
    ? `/api/branding/logo?v=${encodeURIComponent(version)}`
    : "/brand/kha-il-yahn-logo.png";
