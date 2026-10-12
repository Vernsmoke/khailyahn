import { GymLogo } from "@/components/branding/gym-logo";

export function WorkspaceLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`workspace-loading ${compact ? "compact" : "fullscreen"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="workspace-loading-brand" aria-hidden="true">
        <GymLogo variant="loading" />
      </div>
      <div className="workspace-loading-copy">
        <strong>
          {compact ? "Getting your records ready" : "KHA-IL-YAHN"}
        </strong>
        <p>
          {compact
            ? "Loading the latest gym information…"
            : "Preparing your gym workspace…"}
        </p>
      </div>
      <div className="workspace-loading-track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
