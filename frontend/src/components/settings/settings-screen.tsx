"use client";
import { FeeSettings } from "@/components/settings/fee-settings";
import { LogoSettings } from "@/components/settings/logo-settings";
import { PageHeader } from "@/components/ui/primitives";

export function SettingsScreen() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage membership prices and your gym’s branding."
      />
      <div className="settings-grid">
        <FeeSettings />
        <LogoSettings />
      </div>
    </>
  );
}
