"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ErrorNotice } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";

import { logoUrl, useBranding } from "@/components/providers/branding-provider";

export function LogoSettings() {
  const { version, setVersion } = useBranding();
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function select(file?: File) {
    setError("");
    setMessage("");
    setPreview("");
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_048_576
    ) {
      setError("Choose a PNG, JPEG, or WebP logo under 1 MB.");
      if (input.current) input.current.value = "";
      return;
    }
    setReading(true);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(
            new Error("This file could not be read. Please choose it again."),
          );
        reader.readAsDataURL(file);
      });
      setPreview(image);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setReading(false);
    }
  }
  async function save(logo: string | null) {
    if (busy || reading) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ version: string }>("branding/logo", {
        method: "PATCH",
        body: JSON.stringify({ logo }),
      });
      setVersion(result.version);
      setPreview("");
      if (input.current) input.current.value = "";
      setMessage(logo ? "Logo updated." : "Original logo restored.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <h2>App logo</h2>
      <p className="muted">
        Shown on the sign-in page and navigation. PNG, JPEG, or WebP, up to 1
        MB. Transparent PNG works well.
      </p>
      <ErrorNotice message={error} />
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (preview) void save(preview);
        }}
      >
        <div className="logo-previews">
          <figure>
            <Image
              src={preview || logoUrl(version)}
              alt="App logo preview"
              width={112}
              height={112}
              unoptimized
              className="logo-preview-login"
            />
            <figcaption>Sign-in · 112px</figcaption>
          </figure>
          <figure>
            <Image
              src={preview || logoUrl(version)}
              alt="Sidebar logo preview"
              width={48}
              height={48}
              unoptimized
              className="logo-preview-sidebar"
            />
            <figcaption>Sidebar · 48px</figcaption>
          </figure>
        </div>
        {preview && (
          <p role="status" className="form-footnote">
            Unsaved logo preview. Save to apply it to the workspace and sign-in
            page.
          </p>
        )}
        <label>
          Choose app logo
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || reading}
            onChange={(event) => void select(event.target.files?.[0])}
          />
        </label>
        <div className="modal-actions">
          {version && (
            <button
              className="button"
              type="button"
              disabled={busy || reading}
              onClick={() => void save(null)}
            >
              Restore original logo
            </button>
          )}
          <button
            className="button primary"
            disabled={busy || reading || !preview}
          >
            {reading ? "Reading…" : busy ? "Saving…" : "Save logo"}
          </button>
        </div>
      </form>
    </section>
  );
}
