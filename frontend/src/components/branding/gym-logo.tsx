"use client";
import Image from "next/image";
import { logoUrl, useBranding } from "@/components/providers/branding-provider";

type GymLogoVariant = "login" | "sidebar" | "loading";

const logoPresentation: Record<
  GymLogoVariant,
  { className: string; sizes: string }
> = {
  login: { className: "gym-logo gym-logo-login", sizes: "112px" },
  sidebar: { className: "gym-logo", sizes: "48px" },
  loading: { className: "gym-logo", sizes: "84px" },
};

export function GymLogo({ variant = "sidebar" }: { variant?: GymLogoVariant }) {
  const { version } = useBranding();
  const presentation = logoPresentation[variant];
  return (
    <Image
      src={logoUrl(version)}
      unoptimized={!!version}
      alt="KHA-IL-YAHN Fitness GYM logo"
      width={947}
      height={815}
      quality={100}
      preload={variant === "login"}
      sizes={presentation.sizes}
      className={presentation.className}
    />
  );
}
