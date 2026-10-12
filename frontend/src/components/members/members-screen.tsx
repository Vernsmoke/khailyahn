"use client";
import { MemberPhoto, PhotoField } from "@/components/members/member-photo";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  DownloadSimple,
  PencilSimple,
  QrCode,
  UserPlus,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import type {
  MemberView,
  Payment,
  CheckIn,
  MemberHistoryRecord,
} from "@/lib/types";
import { addMonths, dateTime, displayDate, today } from "@/lib/dates";
import {
  Avatar,
  Badge,
  Empty,
  ErrorNotice,
  FilterSummary,
  RefreshNotice,
  Loading,
  Modal,
  PageHeader,
  Pager,
  Search,
  Submit,
} from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { money } from "@/lib/format";
import { useRegistrationDraft } from "@/hooks/use-registration-draft";
import { useApi } from "@/hooks/use-api";
import { useFeeQuote, STALE_FEE_MESSAGE } from "@/hooks/use-fee-quote";

export function EligibilityBadge({ member }: { member: MemberView }) {
  if (member.status === "ARCHIVED") return <Badge>Archived</Badge>;
  if (member.eligibility.approved)
    return (
      <Badge tone={member.eligibility.grace ? "warning" : "success"}>
        {member.eligibility.grace ? "In grace · eligible" : "Entry eligible"}
      </Badge>
    );
  return <Badge tone="danger">No entry</Badge>;
}
function EntitlementCell({
  member,
  annual = false,
}: {
  member: MemberView;
  annual?: boolean;
}) {
  const item = annual ? member.annual : member.monthly;
  if (!item) return <span className="muted">Not activated</span>;
  return (
    <div className="date-cell">
      <span>{displayDate(item.expires_on)}</span>
      <small className={item.status === "CANCELLED" ? "danger-text" : "muted"}>
        {item.status === "CANCELLED"
          ? "Cancelled"
          : annual
            ? "First expired day"
            : "Last active day"}
      </small>
    </div>
  );
}
export function MembersScreen({ renewal = false }: { renewal?: boolean }) {
  const { data: fees } = useApi<{ ANNUAL: number; MONTHLY: number }>("fees");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("REGISTERED"),
    [refresh, setRefresh] = useState(0);
  const { data, loading, error, refreshing, retry } = useApi<MemberView[]>(
    `members?search=${encodeURIComponent(search)}&status=${status}`,
    refresh,
  );
  const filtersActive = Boolean(search.trim() || status !== "REGISTERED");
  const clearFilters = () => {
    setSearch("");
    setStatus("REGISTERED");
  };
  const [selected, setSelected] = useState<MemberView>(),
    [paying, setPaying] = useState<MemberView>();
  return (
    <>
      <PageHeader
        title={renewal ? "Membership & access" : "Members"}
        description={
          renewal
            ? "Review eligibility, renew annual membership, and manage monthly access."
            : "Find member profiles, eligibility, and access details."
        }
        actions={
          <Link href="/register" className="button primary">
            <UserPlus size={18} />
            Register member
          </Link>
        }
      />
      {renewal && (
        <div className="info-strip">
          <div>
            <strong>
              {fees ? money(fees.ANNUAL) : "Loading…"}{" "}
              <span>/ annual membership</span>
            </strong>
            <small>12 months of registered membership</small>
          </div>
          <div>
            <strong>
              {fees ? money(fees.MONTHLY) : "Loading…"}{" "}
              <span>/ monthly access</span>
            </strong>
            <small>One calendar month · separate payment</small>
          </div>
          <div>
            <Warning size={20} />
            <span>Entry requires monthly access and annual eligibility.</span>
          </div>
        </div>
      )}
      <div
        className="workspace-filters toolbar member-filters"
        aria-label="Member filters"
      >
        <Search value={search} onChange={setSearch} />
        <div className="tabs" role="group" aria-label="Member status">
          <button
            className={status === "REGISTERED" ? "selected" : ""}
            aria-pressed={status === "REGISTERED"}
            onClick={() => setStatus("REGISTERED")}
          >
            Registered members
          </button>
          <button
            className={status === "ARCHIVED" ? "selected" : ""}
            aria-pressed={status === "ARCHIVED"}
            onClick={() => setStatus("ARCHIVED")}
          >
            Archived
          </button>
          <button
            className={status === "" ? "selected" : ""}
            aria-pressed={status === ""}
            onClick={() => setStatus("")}
          >
            All
          </button>
        </div>
      </div>
      <FilterSummary
        count={data?.length}
        filters={[
          status === "ARCHIVED"
            ? "Archived members"
            : status === ""
              ? "All member statuses"
              : "Registered members",
          search && `Search: ${search}`,
        ]}
        onClear={clearFilters}
      />
      <section className="panel">
        <ErrorNotice message={error} onRetry={retry} />
        <RefreshNotice refreshing={refreshing} />
        {loading ? (
          <Loading />
        ) : !data && error ? null : !data?.length ? (
          <Empty
            title={filtersActive ? "No matching members" : "No members yet"}
            text={
              filtersActive
                ? "Clear the filters to return to registered members."
                : "Register a member and confirm the annual payment to get started."
            }
          >
            {filtersActive ? (
              <button className="button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <Link className="button primary" href="/register">
                <UserPlus size={17} />
                Register member
              </Link>
            )}
          </Empty>
        ) : (
          <Pager
            rows={data}
            render={(rows) => (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th className="table-date">Annual expiry</th>
                      <th className="table-date">Monthly valid through</th>
                      <th className="table-status">Entry status</th>
                      <th className="table-date">
                        {renewal ? "Renewal" : "Joined"}
                      </th>
                      <th className="align-right table-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <button
                            className="person-cell member-profile-link"
                            data-history-member={m.id}
                            onClick={() => setSelected(m)}
                          >
                            <Avatar name={m.name} />
                            <span>
                              <strong>{m.name}</strong>
                              <small>{m.code}</small>
                            </span>
                            <ArrowRight
                              className="member-profile-arrow"
                              size={16}
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                        <td className="table-date">
                          <EntitlementCell member={m} annual />
                        </td>
                        <td className="table-date">
                          <EntitlementCell member={m} />
                        </td>
                        <td className="table-status">
                          <div className="status-cell">
                            <EligibilityBadge member={m} />
                            {!m.eligibility.approved && (
                              <small>{m.eligibility.reason}</small>
                            )}
                          </div>
                        </td>
                        <td className="table-date">
                          {renewal && m.status !== "ARCHIVED" ? (
                            <button
                              className="button small primary"
                              onClick={() => setPaying(m)}
                            >
                              <ArrowsClockwise size={15} />
                              Record payment
                            </button>
                          ) : (
                            displayDate(m.created_at.slice(0, 10))
                          )}
                        </td>
                        <td className="align-right table-action">
                          <button
                            className="button small"
                            data-history-member={m.id}
                            onClick={() => setSelected(m)}
                          >
                            View
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />
        )}
      </section>
      {selected && (
        <MemberProfile
          member={selected}
          onClose={() => setSelected(undefined)}
          onChange={(m) => {
            setSelected(m);
            setRefresh((v) => v + 1);
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          member={paying}
          onClose={() => setPaying(undefined)}
          onSuccess={() => {
            setPaying(undefined);
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
export function MemberFields({
  member,
  draft,
}: {
  member?: MemberView;
  draft?: Record<string, string>;
}) {
  return (
    <>
      <div className="form-section-heading">
        <span className="step-number">1</span>
        <div>
          <h2>Personal information</h2>
        </div>
      </div>
      <p className="form-footnote">
        All identity and emergency fields are required unless marked optional.
      </p>
      <div className="form-grid">
        <label className="span-2">
          Full name
          <input
            name="name"
            defaultValue={member?.name ?? draft?.name}
            required
            minLength={2}
            maxLength={100}
            placeholder="Member’s full name"
            autoComplete="name"
          />
        </label>
        <label>
          Date of birth
          <DatePicker
            name="birth_date"
            type="date"
            defaultValue={member?.birth_date ?? draft?.birth_date}
            required
            max={today()}
            min="1900-01-01"
          />
        </label>
        <label>
          Phone number
          <input
            name="phone"
            type="tel"
            defaultValue={member?.phone ?? draft?.phone}
            required
            pattern={String.raw`[+0-9 \(\)\-]+`}
            minLength={7}
            maxLength={24}
            placeholder="09XX XXX XXXX"
          />
        </label>
        <label className="span-2">
          Email address <span className="optional">Optional</span>
          <input
            name="email"
            type="email"
            defaultValue={member?.email ?? draft?.email}
            placeholder="member@example.com"
          />
        </label>
        <label className="span-2">
          Home address
          <input
            name="address"
            defaultValue={member?.address ?? draft?.address}
            required
            minLength={3}
            maxLength={300}
            placeholder="Street, barangay, city"
          />
        </label>
      </div>
      <div className="form-divider" />
      <div className="form-section-heading">
        <span className="step-number">2</span>
        <div>
          <h2>Emergency contact</h2>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Contact name
          <input
            name="emergency_name"
            defaultValue={member?.emergency_name ?? draft?.emergency_name}
            required
            minLength={2}
            maxLength={100}
            placeholder="Full name"
          />
        </label>
        <label>
          Contact phone
          <input
            name="emergency_phone"
            type="tel"
            pattern={String.raw`[+0-9 \(\)\-]+`}
            defaultValue={member?.emergency_phone ?? draft?.emergency_phone}
            required
            minLength={7}
            maxLength={24}
            placeholder="09XX XXX XXXX"
          />
        </label>
        <label>
          Blood type <span className="optional">Optional</span>
          <select
            name="blood_type"
            defaultValue={member?.blood_type || draft?.blood_type || ""}
          >
            <option value="">Not provided</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-divider" />
      <h3>Profile photograph</h3>
      <p className="form-footnote">
        Optional. Helps your team identify the member during check-in.
      </p>
      <PhotoField member={member} initialPhoto={draft?.photo} />
    </>
  );
}
function PaymentFields({
  date,
  setDate,
  prefix = "",
}: {
  date: string;
  setDate: (d: string) => void;
  prefix?: string;
}) {
  return (
    <>
      <label>
        Payment method
        <select name={`${prefix}method`} required defaultValue="">
          <option value="" disabled>
            Select payment method
          </option>
          <option>Cash</option>
          <option>GCash</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Payment date
        <DatePicker
          type="date"
          name={`${prefix}payment_date`}
          required
          min="2000-01-01"
          max={today()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            const confirmation =
              e.currentTarget.form?.querySelector<HTMLInputElement>(
                `input[name="${prefix}confirmed"]`,
              );
            if (confirmation) confirmation.checked = false;
          }}
          onBlur={(event) => {
            if (
              event.currentTarget.value &&
              !event.currentTarget.validity.valid
            )
              event.currentTarget.reportValidity();
          }}
        />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" name={`${prefix}confirmed`} required />
        <span>
          I confirm the payment has been received outside this application.
        </span>
      </label>
    </>
  );
}
export function RegisterScreen({ userId }: { userId: string }) {
  const [draftVersion, setDraftVersion] = useState(0);
  return (
    <RegistrationForm
      key={draftVersion}
      userId={userId}
      onDiscard={() => setDraftVersion((value) => value + 1)}
    />
  );
}
function RegistrationForm({
  userId,
  onDiscard,
}: {
  userId: string;
  onDiscard: () => void;
}) {
  const {
    data: fees,
    error: feeError,
    stale: staleFee,
    verify: verifyFee,
    review: reloadFees,
    refreshing: feesRefreshing,
  } = useFeeQuote();
  const [includeMonthly, setIncludeMonthly] = useState(false);
  const [monthlyDate, setMonthlyDate] = useState(today());
  const draft = useRegistrationDraft(userId, Boolean(fees));
  const { key, monthlyKey, form: draftFormRef, initial: initialDraft } = draft;
  const [discardDraft, setDiscardDraft] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [date, setDate] = useState(today()),
    [created, setCreated] = useState<MemberView>();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const {
      method,
      payment_date,
      confirmed,
      monthly_method,
      monthly_payment_date,
      monthly_confirmed,
      ...member
    } = data;
    try {
      await verifyFee();
      const result = await api<MemberView>("members", {
        method: "POST",
        body: JSON.stringify({
          member,
          monthlyPayment: includeMonthly
            ? {
                fee_type: "MONTHLY",
                expected_amount: fees?.MONTHLY,
                method: monthly_method,
                payment_date: monthly_payment_date,
                confirmed: monthly_confirmed === "on",
                idempotency_key: monthlyKey,
              }
            : undefined,
          payment: {
            fee_type: "ANNUAL",
            expected_amount: fees?.ANNUAL,
            method,
            payment_date,
            confirmed: confirmed === "on",
            idempotency_key: key,
          },
        }),
      });
      draft.clear();
      setCreated(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!fees)
    return feeError ? (
      <ErrorNotice message={feeError} onRetry={reloadFees} />
    ) : (
      <Loading kind="form" />
    );
  if (created)
    return (
      <div className="registration-success">
        <span className="success-emblem">
          <CheckCircle size={40} weight="fill" />
        </span>
        <h1>Member registered</h1>
        <p>
          {created.name} is registered as <strong>{created.code}</strong>.
        </p>
        <div className="notice success" role="status">
          {created.monthly
            ? "Annual and monthly payments confirmed separately."
            : "Annual payment confirmed. Monthly access is inactive until a separate monthly payment is recorded."}
        </div>
        <EligibilityBadge member={created} />
        <QrCard member={created} />
        <Link className="button" href="/scan">
          Scan member QR
        </Link>
        <div className="heading-actions">
          <Link className="button" href="/members">
            View members
          </Link>
          <PaymentLauncher initialMember={created} />
        </div>
      </div>
    );
  return (
    <>
      <PageHeader
        title="Register member"
        description="Create the member profile, confirm payment, and generate their QR code."
        beforeTitle={
          <Link className="text-link back-link" href="/members">
            <ArrowLeft size={16} />
            Members
          </Link>
        }
      />
      <div className="registration-draft-bar">
        <span role="status">
          {draft.status || "Member details are saved as you type in this tab."}
        </span>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => setDiscardDraft(true)}
        >
          Discard draft
        </button>
      </div>
      {discardDraft && (
        <Modal
          title="Discard registration draft?"
          onClose={() => setDiscardDraft(false)}
        >
          <div className="modal-body">
            <p>This will clear the unfinished registration and its photo.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                onClick={() => setDiscardDraft(false)}
              >
                Keep draft
              </button>
              <button
                type="button"
                className="button danger-button"
                onClick={() => {
                  draft.clear();
                  onDiscard();
                }}
              >
                Discard draft
              </button>
            </div>
          </div>
        </Modal>
      )}
      <form ref={draftFormRef} className="register-grid" onSubmit={submit}>
        <section className="panel form-panel">
          <MemberFields draft={initialDraft?.fields} />
        </section>
        <aside className="registration-aside">
          <section className="panel form-panel">
            <div className="form-section-heading">
              <span className="step-number">3</span>
              <div>
                <h2>Annual membership</h2>
                <p>Confirm payment to activate.</p>
              </div>
            </div>
            <div className="fee-display">
              <span>Annual membership</span>
              <strong>
                {money(fees.ANNUAL)}
                <span> / 12 months</span>
              </strong>
              <p>Monthly gym access is paid separately.</p>
            </div>
            <div className="form-stack">
              <PaymentFields
                date={date}
                setDate={(value) => {
                  setDate(value);
                  document
                    .querySelector<HTMLDialogElement>("dialog[open]")
                    ?.querySelectorAll<HTMLInputElement>(
                      'input[name="confirmed"]',
                    )
                    .forEach((field) => {
                      field.checked = false;
                    });
                }}
              />
              <div className="date-preview">
                <span>
                  Starts<strong>{displayDate(date || today())}</strong>
                </span>
                <span>
                  First expired day
                  <strong>{displayDate(addMonths(date || today(), 12))}</strong>
                </span>
              </div>
              <ErrorNotice
                message={error || (staleFee ? STALE_FEE_MESSAGE : "")}
              />
              {(staleFee || error.includes("fee has changed")) && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    reloadFees();
                    setError("");
                    draftFormRef.current
                      ?.querySelectorAll<HTMLInputElement>(
                        'input[name$="confirmed"]',
                      )
                      .forEach((field) => {
                        field.checked = false;
                      });
                  }}
                >
                  Review latest fees and confirm again
                </button>
              )}
              <p className="form-footnote">
                Annual expiry is the first expired day. Monthly access includes
                its last active day. Entry always requires both entitlements.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeMonthly}
                  onChange={(event) => setIncludeMonthly(event.target.checked)}
                />
                <span>
                  Add monthly gym access — {money(fees.MONTHLY)} / calendar
                  month
                </span>
              </label>
              {includeMonthly && (
                <fieldset className="form-stack">
                  <legend>Monthly access payment</legend>
                  <PaymentFields
                    date={monthlyDate}
                    setDate={setMonthlyDate}
                    prefix="monthly_"
                  />
                  <div className="date-preview">
                    <span>
                      Starts
                      <strong>{displayDate(monthlyDate || today())}</strong>
                    </span>
                    <span>
                      Last active day
                      <strong>
                        {displayDate(addMonths(monthlyDate || today(), 1))}
                      </strong>
                    </span>
                  </div>
                </fieldset>
              )}
              <div className="registration-submit">
                <p>
                  Total to confirm:{" "}
                  <strong>
                    {money(fees.ANNUAL + (includeMonthly ? fees.MONTHLY : 0))}
                  </strong>
                </p>
                <Submit
                  busy={busy}
                  disabled={
                    staleFee ||
                    feesRefreshing ||
                    error.includes("fee has changed")
                  }
                >
                  Confirm & register member
                  <ArrowRight size={18} />
                </Submit>
              </div>
            </div>
          </section>
          <div className="gentle-note">
            <QrCode size={24} />
            <div>
              <h3>Member QR</h3>
              <p>Valid across renewals.</p>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
export function QrCard({ member }: { member: MemberView }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(member.qr_token, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: "M",
    }).then((value) => {
      if (active) setSrc(value);
    });
    return () => {
      active = false;
    };
  }, [member.qr_token]);
  return (
    <div className="qr-card">
      {src ? (
        <Image
          src={src}
          width={200}
          height={200}
          alt={`Member QR for ${member.name}`}
          unoptimized
        />
      ) : (
        <Loading />
      )}
      <strong>{member.name}</strong>
      <span>{member.code}</span>
      {src && (
        <a
          className="button small"
          href={src}
          download={`${member.code}-QR.png`}
        >
          <DownloadSimple size={16} />
          Download member QR
        </a>
      )}
    </div>
  );
}
export function PaymentDialog({
  member,
  onClose,
  onSuccess,
  initialFee = "MONTHLY",
}: {
  member: MemberView;
  onClose: () => void;
  onSuccess: (m: MemberView) => void;
  initialFee?: "ANNUAL" | "MONTHLY";
}) {
  const {
    data: fees,
    error: feeError,
    stale: staleFee,
    verify: verifyFee,
    review: reloadFees,
    refreshing: feesRefreshing,
  } = useFeeQuote();
  const [fee, setFee] = useState(initialFee),
    [date, setDate] = useState(today()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const {
    data: preview,
    loading,
    error: previewError,
  } = useApi<{
    start: string;
    end: string;
    period_start: string;
    grace_end?: string;
  }>(`members/${member.id}/preview?fee=${fee}&date=${date || today()}`);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await verifyFee();
      const result = await api<MemberView>(`members/${member.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          fee_type: fee,
          expected_amount: fees?.[fee],
          method: form.method,
          payment_date: date,
          confirmed: form.confirmed === "on",
          idempotency_key: key,
        }),
      });
      onSuccess(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!fees)
    return (
      <Modal title="Record a payment" onClose={onClose}>
        {feeError ? (
          <ErrorNotice message={feeError} onRetry={reloadFees} />
        ) : (
          <Loading kind="form" />
        )}
      </Modal>
    );
  return (
    <Modal title="Record a payment" onClose={onClose} protectChanges>
      <form className="modal-body form-stack" onSubmit={submit}>
        <div className="member-summary">
          <Avatar name={member.name} />
          <div>
            <strong>{member.name}</strong>
            <small>{member.code}</small>
          </div>
        </div>
        <label>
          Fee type
          <select
            value={fee}
            onChange={(e) => {
              setFee(e.target.value as typeof fee);
              const confirmation =
                e.currentTarget.form?.querySelector<HTMLInputElement>(
                  'input[name="confirmed"]',
                );
              if (confirmation) confirmation.checked = false;
            }}
          >
            <option value="MONTHLY">
              Monthly access · {money(fees.MONTHLY)}
            </option>
            <option value="ANNUAL">
              Annual membership · {money(fees.ANNUAL)}
            </option>
          </select>
        </label>
        <div className="fee-display">
          <span>
            {fee === "ANNUAL" ? "Annual membership" : "Monthly access"}
          </span>
          <strong>{money(fees[fee])}</strong>
          <p>Fixed fee · manual payment confirmation</p>
        </div>
        <PaymentFields date={date} setDate={setDate} />
        {preview && (
          <div className="date-preview">
            <span>
              Access starts<strong>{displayDate(preview.start)}</strong>
            </span>
            {preview.period_start !== preview.start && (
              <span>
                Extension continues from
                <strong>{displayDate(preview.period_start)}</strong>
              </span>
            )}
            <span>
              {fee === "ANNUAL" ? "First expired day" : "Last active day"}
              <strong>{displayDate(preview.end)}</strong>
            </span>
            {preview.grace_end && (
              <span>
                Grace ends (inclusive)
                <strong>{displayDate(preview.grace_end)}</strong>
              </span>
            )}
          </div>
        )}
        {fee === "ANNUAL" && preview && preview.end <= today() && (
          <div className="notice warning">
            This expiry-based renewal still ends in the past. Another annual
            renewal may be required for entry.
          </div>
        )}
        {fee === "MONTHLY" && (
          <p className="form-footnote">
            Monthly access alone does not guarantee entry. Annual eligibility is
            also checked.
          </p>
        )}
        <p className="form-footnote">
          {fee === "ANNUAL"
            ? "Annual membership expires at the start of the expiry date. Grace includes the displayed grace-end date; monthly access must still be active."
            : "Monthly access includes the end date. Active access extends its existing end date; expired or cancelled access restarts on the payment date."}
        </p>
        <ErrorNotice
          message={error || previewError || (staleFee ? STALE_FEE_MESSAGE : "")}
        />
        {(staleFee || error.includes("fee has changed")) && (
          <button
            type="button"
            className="button"
            onClick={(event) => {
              reloadFees();
              setError("");
              event.currentTarget.form
                ?.querySelectorAll<HTMLInputElement>('input[name="confirmed"]')
                .forEach((field) => {
                  field.checked = false;
                });
            }}
          >
            Review latest fee and confirm again
          </button>
        )}
        <div className="modal-actions">
          <button
            className="button"
            type="button"
            onClick={onClose}
            data-discard
            disabled={busy}
          >
            Cancel
          </button>
          <Submit
            busy={busy}
            disabled={
              loading ||
              !preview ||
              Boolean(previewError) ||
              staleFee ||
              feesRefreshing ||
              error.includes("fee has changed")
            }
          >
            Confirm payment
          </Submit>
        </div>
      </form>
    </Modal>
  );
}
export function PaymentLauncher({
  initialMember,
  onSuccess,
}: {
  initialMember?: MemberView;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(initialMember),
    [search, setSearch] = useState("");
  const {
    data,
    error: membersError,
    retry: retryMembers,
  } = useApi<MemberView[]>("members?status=REGISTERED");
  const filteredMembers =
    data?.filter((member) =>
      `${member.name} ${member.code}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ) ?? [];
  return (
    <>
      <button className="button primary" onClick={() => setOpen(true)}>
        Record payment
        <ArrowRight size={17} />
      </button>
      {open && selected ? (
        <PaymentDialog
          member={selected}
          onClose={() => {
            setOpen(false);
            setSelected(initialMember);
          }}
          onSuccess={() => {
            setOpen(false);
            setSelected(initialMember);
            onSuccess?.();
          }}
        />
      ) : open ? (
        <Modal title="Choose a member" onClose={() => setOpen(false)}>
          <div className="modal-body">
            <Search value={search} onChange={setSearch} />
            {!data ? (
              membersError ? (
                <ErrorNotice message={membersError} onRetry={retryMembers} />
              ) : (
                <Loading />
              )
            ) : (
              <div className="member-picker">
                {filteredMembers.map((m) => (
                  <button key={m.id} onClick={() => setSelected(m)}>
                    <Avatar name={m.name} />
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.code}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
                {!filteredMembers.length && (
                  <Empty
                    title={
                      search.trim()
                        ? "No matching members"
                        : "No registered members"
                    }
                    text={
                      search.trim()
                        ? "Clear the search to see every registered member."
                        : "Register a member before recording monthly access or renewals."
                    }
                  >
                    {search.trim() ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() => setSearch("")}
                      >
                        Clear search
                      </button>
                    ) : (
                      <Link className="button primary" href="/register">
                        <UserPlus size={17} />
                        Register member
                      </Link>
                    )}
                  </Empty>
                )}
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
export function MemberProfile({
  member,
  onClose,
  onChange,
}: {
  member: MemberView;
  onClose: () => void;
  onChange: (m: MemberView) => void;
}) {
  const [edit, setEdit] = useState(false),
    [pay, setPay] = useState(false),
    [cancel, setCancel] = useState<"ANNUAL" | "MONTHLY" | "ARCHIVE">(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const {
    data: payments,
    error: paymentsError,
    loading: paymentsLoading,
    retry: retryPayments,
  } = useApi<Payment[]>(`payments?member=${member.id}`, refresh);
  const {
    data: logs,
    error: logsError,
    loading: logsLoading,
    retry: retryLogs,
  } = useApi<CheckIn[]>(`check-ins?member=${member.id}`, refresh);
  const {
    data: history,
    error: historyError,
    loading: historyLoading,
    retry: retryHistory,
  } = useApi<MemberHistoryRecord[]>(`members/${member.id}/history`, refresh);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<MemberView>(`members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      onChange(result);
      setEdit(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!pay && !cancel && (
        <Modal
          title={edit ? "Edit member" : "Member profile"}
          protectChanges={edit}
          onClose={onClose}
          wide
        >
          {edit ? (
            <form className="modal-body" onSubmit={save}>
              <MemberFields member={member} />
              <ErrorNotice message={error} />
              <div className="modal-actions">
                <button
                  className="button"
                  type="button"
                  data-discard
                  onClick={() => setEdit(false)}
                >
                  Back
                </button>
                <Submit busy={busy}>Save member</Submit>
              </div>
            </form>
          ) : (
            <div className="modal-body">
              <div className="profile-top">
                <MemberPhoto member={member} />
                <div>
                  <h2>{member.name}</h2>
                  <p>
                    {member.code} · Joined{" "}
                    {displayDate(member.created_at.slice(0, 10))}
                  </p>
                </div>
                <EligibilityBadge member={member} />
                {member.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setPay(true)}
                  >
                    Record payment
                  </button>
                )}
              </div>
              {member.status !== "ARCHIVED" && (
                <button
                  type="button"
                  className="button"
                  onClick={() => setEdit(true)}
                >
                  Change profile picture
                </button>
              )}
              <div className="profile-grid">
                <div>
                  <div className="profile-entitlements">
                    <div>
                      <h3>Annual membership</h3>
                      <small>
                        Started {displayDate(member.annual?.start_date)}
                      </small>
                      <EntitlementCell member={member} annual />
                      <small>
                        Grace through {displayDate(member.annual?.grace_end)}
                      </small>
                    </div>
                    <div>
                      <h3>Monthly access</h3>
                      <small>
                        Started {displayDate(member.monthly?.start_date)}
                      </small>
                      <EntitlementCell member={member} />
                    </div>
                  </div>
                  <h3 className="history-heading">
                    Identity & emergency contact
                  </h3>
                  <dl className="details-list">
                    <dt>Phone</dt>
                    <dd>{member.phone}</dd>
                    <dt>Email</dt>
                    <dd>{member.email || "Not provided"}</dd>
                    <dt>Date of birth</dt>
                    <dd>{displayDate(member.birth_date)}</dd>
                    <dt>Address</dt>
                    <dd>{member.address}</dd>
                    <dt>Emergency contact</dt>
                    <dd>
                      {member.emergency_name} · {member.emergency_phone}
                    </dd>
                    <dt>Blood type</dt>
                    <dd>{member.blood_type || "Not provided"}</dd>
                  </dl>
                </div>
                <QrCard member={member} />
              </div>
              {member.status !== "ARCHIVED" && (
                <div className="profile-actions">
                  <button className="button" onClick={() => setEdit(true)}>
                    <PencilSimple size={16} />
                    Edit member
                  </button>
                </div>
              )}
              {member.status !== "ARCHIVED" && (
                <details className="profile-danger-actions">
                  <summary>Cancellation & archiving</summary>
                  <p>
                    These actions stop entry eligibility and keep all historical
                    payments and check-ins.
                  </p>
                  <button
                    className="button danger-outline"
                    onClick={() => setCancel("ARCHIVE")}
                  >
                    Archive member
                  </button>
                  {member.annual?.status === "ACTIVE" && (
                    <button
                      className="text-button danger-text"
                      onClick={() => setCancel("ANNUAL")}
                    >
                      Cancel annual
                    </button>
                  )}
                  {member.monthly?.status === "ACTIVE" && (
                    <button
                      className="text-button danger-text"
                      onClick={() => setCancel("MONTHLY")}
                    >
                      Cancel monthly
                    </button>
                  )}
                </details>
              )}
              <div className="form-divider" />
              <h3>Payment history</h3>
              <ErrorNotice message={paymentsError} onRetry={retryPayments} />
              {paymentsLoading ? (
                <Loading />
              ) : !payments && paymentsError ? null : payments?.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="table-supporting">Fee</th>
                        <th className="table-date">Date paid</th>
                        <th className="table-number">Amount</th>
                        <th className="table-date">Period recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="table-supporting">
                            <div className="date-cell">
                              <span>
                                {p.fee_type === "ANNUAL"
                                  ? "Annual membership"
                                  : "Monthly access"}
                              </span>
                              <small className="payment-status">
                                Confirmed
                              </small>
                            </div>
                          </td>
                          <td className="table-date">
                            {displayDate(p.payment_date)}
                          </td>
                          <td className="table-number">{money(p.amount)}</td>
                          <td className="table-date">
                            {displayDate(p.period_start)} →{" "}
                            {displayDate(p.period_end)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  compact
                  title="No payments recorded"
                  text="Record a payment to activate or extend this member’s access."
                >
                  {member.status !== "ARCHIVED" && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => setPay(true)}
                    >
                      Record payment
                    </button>
                  )}
                </Empty>
              )}
              <h3 className="history-heading">Member history</h3>
              <ErrorNotice message={historyError} onRetry={retryHistory} />
              {historyLoading ? (
                <Loading />
              ) : (
                history && (
                  <ol className="member-history">
                    {history.map((record) => (
                      <li key={record.id}>
                        <time dateTime={record.created_at}>
                          {dateTime(record.created_at)}
                        </time>
                        <p>{record.description}</p>
                        {record.reason && (
                          <strong>Reason: {record.reason}</strong>
                        )}
                      </li>
                    ))}
                  </ol>
                )
              )}
              <h3 className="history-heading">Recent check-ins</h3>
              <ErrorNotice message={logsError} onRetry={retryLogs} />
              {logsLoading ? (
                <Loading />
              ) : !logs && logsError ? null : logs?.length ? (
                logs.slice(0, 5).map((c) => (
                  <div className="history-row" key={c.id}>
                    <span>{dateTime(c.scanned_at)}</span>
                    <span>{c.reason || "Entry approved"}</span>
                    <Badge
                      tone={c.result === "APPROVED" ? "success" : "danger"}
                    >
                      {c.result}
                    </Badge>
                  </div>
                ))
              ) : (
                <Empty
                  compact
                  title="No entry scans yet"
                  text="Scan this member’s QR to record their first entry attempt."
                >
                  <Link className="button" href="/scan">
                    <QrCode size={17} />
                    Scan member QR
                  </Link>
                </Empty>
              )}
            </div>
          )}
        </Modal>
      )}
      {pay && (
        <PaymentDialog
          member={member}
          onClose={() => setPay(false)}
          onSuccess={(m) => {
            onChange(m);
            setRefresh((v) => v + 1);
            setPay(false);
          }}
        />
      )}
      {cancel && (
        <CancelDialog
          member={member}
          action={cancel}
          onClose={() => setCancel(undefined)}
          onSuccess={(m) => {
            onChange(m);
            setCancel(undefined);
            setRefresh((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
function CancelDialog({
  member,
  action,
  onClose,
  onSuccess,
}: {
  member: MemberView;
  action: "ANNUAL" | "MONTHLY" | "ARCHIVE";
  onClose: () => void;
  onSuccess: (m: MemberView) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const label =
    action === "ARCHIVE"
      ? "Archive member"
      : `Cancel ${action.toLowerCase()} ${action === "ANNUAL" ? "membership" : "access"}`;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      onSuccess(
        await api<MemberView>(`members/${member.id}/cancel`, {
          method: "POST",
          body: JSON.stringify({
            action,
            reason: form.get("reason"),
            confirmed: form.get("confirmed") === "on",
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={label} onClose={onClose}>
      <form className="modal-body form-stack" onSubmit={submit}>
        <div className="notice danger">
          <XCircle size={22} />
          <span>
            {member.name} will no longer be eligible for entry. Payment and
            check-in history will be preserved. This does not issue a refund.{" "}
            {action === "ARCHIVE"
              ? "Archiving is permanent in this workspace; there is no restore action."
              : "Cancelled access can be restarted by recording a new payment."}
          </span>
        </div>
        <label>
          Reason
          <textarea
            name="reason"
            required
            minLength={3}
            maxLength={500}
            placeholder="Explain why this action is needed"
            rows={3}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="confirmed" required />
          <span>
            I confirm: {label.toLowerCase()} for {member.name}.
          </span>
        </label>
        <ErrorNotice message={error} />
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            Go back
          </button>
          <button className="button danger-button" disabled={busy}>
            {busy ? "Saving…" : label}
          </button>
        </div>
      </form>
    </Modal>
  );
}
