"use client";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DatePicker } from "@/components/ui/date-picker";
import { WorkspaceLoading } from "@/components/layout/workspace-loading";
import { addDays, today } from "@/lib/dates";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleNotch,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Loading({
  kind = "records",
}: {
  kind?: "records" | "dashboard" | "form";
}) {
  return (
    <div className={`records-loading loading-${kind}`} aria-busy="true">
      <WorkspaceLoading compact />
      <div className="skeleton-heading" aria-hidden="true" />
      {kind === "dashboard" && (
        <div className="skeleton-metrics" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} />
          ))}
        </div>
      )}
      <div className="skeleton-records" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} />
        ))}
      </div>
    </div>
  );
}
export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return message ? (
    <div className="notice danger" role="alert">
      {message}
      {onRetry && (
        <button type="button" className="button small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  ) : null;
}
export function RefreshNotice({ refreshing }: { refreshing: boolean }) {
  return (
    <span className="refresh-feedback" role="status">
      {refreshing ? "Refreshing records…" : ""}
    </span>
  );
}
export function FilterSummary({
  count,
  filters,
  onClear,
}: {
  count?: number;
  filters: string[];
  onClear: () => void;
}) {
  return (
    <div className="filter-summary">
      <span role="status">
        {count === undefined
          ? "Loading results…"
          : `${count.toLocaleString()} result${count === 1 ? "" : "s"}`}
      </span>
      {filters.filter(Boolean).map((filter, index) => (
        <span className="active-filter" key={`${index}:${filter}`}>
          {filter}
        </span>
      ))}
      {filters.some(Boolean) && (
        <button type="button" className="text-button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
export function Empty({
  title = "No records yet",
  text = "Records will appear here as your team works.",
  children,
  compact = false,
}: {
  title?: string;
  text?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty${compact ? " compact" : ""}`}>
      <h3>{title}</h3>
      <p>{text}</p>
      {children ? <div className="empty-actions">{children}</div> : null}
    </div>
  );
}
export function PageHeader({
  title,
  description,
  actions,
  beforeTitle,
}: {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  beforeTitle?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="page-heading-copy">
        {beforeTitle}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </header>
  );
}
export function Metric({
  label,
  value,
  note,
  icon,
  priority = false,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon: ReactNode;
  priority?: boolean;
}) {
  return (
    <section className={`metric${priority ? " metric-priority" : ""}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </section>
  );
}
export function Search({
  value,
  onChange,
  placeholder = "Search name or member ID…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="search" role="search" aria-label="Search records">
      <MagnifyingGlass size={18} aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-button search-clear"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  protectChanges = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  protectChanges?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const guard = useUnsavedChanges(ref, protectChanges);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className={`modal ${wide ? "wide" : ""}`}
        onCancel={(event) => {
          event.preventDefault();
          guard.request(onClose);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) guard.request(onClose);
        }}
        onClickCapture={(event) => {
          const button = (event.target as Element).closest<HTMLButtonElement>(
            "[data-discard]",
          );
          if (!button) return;
          event.preventDefault();
          event.stopPropagation();
          guard.request(() => {
            button.removeAttribute("data-discard");
            button.click();
            button.setAttribute("data-discard", "");
          });
        }}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            title="Close dialog"
            onClick={() => guard.request(onClose)}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </dialog>
      {guard.pending && (
        <Modal title="Discard unsaved changes?" onClose={guard.keep}>
          <div className="modal-body">
            <p>
              Your changes haven’t been saved. Leaving now will discard them.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                autoFocus
                onClick={guard.keep}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="button danger-button"
                onClick={guard.discard}
              >
                Discard changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Submit({
  busy,
  disabled = false,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className="button primary"
      disabled={busy || disabled}
      aria-busy={busy}
    >
      {busy ? <CircleNotch className="spin" size={18} /> : null}
      {busy ? "Saving…" : children}
    </button>
  );
}
export function Pager<T>({
  rows,
  render,
}: {
  rows: T[];
  render: (visible: T[]) => ReactNode;
}) {
  const [page, setPage] = useState(0),
    size = 10;
  const max = Math.max(0, Math.ceil(rows.length / size) - 1),
    current = Math.min(page, max);
  return (
    <>
      {render(rows.slice(current * size, (current + 1) * size))}
      <div className="pager">
        <span>
          {rows.length
            ? `${current * size + 1}–${Math.min((current + 1) * size, rows.length)} of ${rows.length}`
            : "0 records"}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            title="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Next page"
            title="Next page"
            disabled={current >= max}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
export function DateFilters({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  return (
    <div className="date-filters">
      <label>
        From
        <DatePicker
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        To
        <DatePicker
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
    </div>
  );
}
export function DatePresets({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const day = today();
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  const weekStart = addDays(day, -((weekday + 6) % 7));
  const selected =
    from === day && to === day
      ? "Today"
      : from === weekStart && to === day
        ? "This week"
        : from || to
          ? "Custom"
          : "All dates";
  return (
    <div className="date-presets" role="group" aria-label="Date presets">
      {["All dates", "Today", "This week", "Custom"].map((preset) => (
        <button
          type="button"
          className="button small"
          aria-pressed={selected === preset}
          key={preset}
          onClick={(event) => {
            if (preset === "Custom") {
              event.currentTarget
                .closest(".workspace-filters")
                ?.querySelector<HTMLInputElement>(".date-filters input")
                ?.focus();
              return;
            }
            setFrom(
              preset === "Today"
                ? day
                : preset === "This week"
                  ? weekStart
                  : "",
            );
            setTo(preset === "All dates" ? "" : day);
          }}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar">
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
