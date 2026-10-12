"use client";
import { useState, type FormEvent } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { ErrorNotice, Loading } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { money } from "@/lib/format";
import { useApi } from "@/hooks/use-api";

export function FeeSettings() {
  const [refresh, setRefresh] = useState(0);
  const { data, error, retry } = useApi<{ ANNUAL: number; MONTHLY: number }>(
    "fees",
    refresh,
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<{
    ANNUAL: number;
    MONTHLY: number;
  } | null>(null);
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFailure("");
    setSaved(false);
    setPending({
      ANNUAL: Math.round(Number(values.get("annual")) * 100),
      MONTHLY: Math.round(Number(values.get("monthly")) * 100),
    });
  }
  async function save() {
    if (!pending || busy) return;
    setBusy(true);
    setFailure("");
    setSaved(false);
    try {
      await api("fees", {
        method: "PATCH",
        body: JSON.stringify(pending),
      });
      setSaved(true);
      setDirty(false);
      setPending(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setFailure((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <h2>Membership fees</h2>
      <p className="muted">
        Applies to new payments. Past payments stay unchanged.
      </p>
      <ErrorNotice
        message={(!pending ? failure : "") || error}
        onRetry={error ? retry : undefined}
      />
      {data ? (
        <form
          className="form-stack"
          onSubmit={review}
          onChange={(event) => {
            setSaved(false);
            setPending(null);
            const values = new FormData(event.currentTarget);
            setDirty(
              Math.round(Number(values.get("annual")) * 100) !== data.ANNUAL ||
                Math.round(Number(values.get("monthly")) * 100) !==
                  data.MONTHLY,
            );
          }}
          key={`${data.ANNUAL}:${data.MONTHLY}`}
        >
          <label>
            Annual membership (₱)
            <input
              disabled={busy}
              name="annual"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              defaultValue={data.ANNUAL / 100}
            />
          </label>
          <small className="active-fee">
            Active fee: {money(data.ANNUAL)} / 12 months
          </small>
          <label>
            Monthly access (₱)
            <input
              disabled={busy}
              name="monthly"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              defaultValue={data.MONTHLY / 100}
            />
          </label>
          <small className="active-fee">
            Active fee: {money(data.MONTHLY)} / calendar month
          </small>
          <button className="button primary" disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save fee prices"}
          </button>
        </form>
      ) : (
        !error && <Loading kind="form" />
      )}
      <p role="status" className="fee-save-feedback">
        {busy
          ? "Saving fee prices…"
          : dirty && !saved
            ? "Unsaved fee changes"
            : ""}
        {saved && (
          <>
            <CheckCircle size={18} aria-hidden="true" /> Fee prices updated.
          </>
        )}
      </p>
      {pending && data && (
        <section
          className="inline-confirmation form-stack"
          aria-label="Confirm fee changes"
          aria-busy={busy}
        >
          <h3>Confirm fee changes</h3>
          <p>
            These prices will apply to new payments. Past payments stay
            unchanged.
          </p>
          <div className="fee-display">
            <span>Annual membership</span>
            <strong>
              {money(data.ANNUAL)} → {money(pending.ANNUAL)}
            </strong>
          </div>
          <div className="fee-display">
            <span>Monthly access</span>
            <strong>
              {money(data.MONTHLY)} → {money(pending.MONTHLY)}
            </strong>
          </div>
          <ErrorNotice message={failure} />
          <div className="modal-actions">
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={save}
            >
              {busy ? "Saving…" : "Confirm fee changes"}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
