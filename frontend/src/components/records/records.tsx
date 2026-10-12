"use client";
import { MemberPhoto, PhotoField } from "@/components/members/member-photo";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ChartBar,
  CheckCircle,
  Clock,
  Receipt,
  UserPlus,
  UsersThree,
  Wallet,
  PencilSimple,
  QrCode,
} from "@phosphor-icons/react";
import type { Activity, CheckIn, Payment, User } from "@/lib/types";
import type { activities, analytics } from "@/lib/server/reports";
import { addMonths, dateTime, displayDate, today } from "@/lib/dates";
import {
  Avatar,
  Badge,
  DateFilters,
  DatePresets,
  FilterSummary,
  RefreshNotice,
  Empty,
  ErrorNotice,
  Loading,
  Metric,
  Modal,
  PageHeader,
  Pager,
  Search,
  Submit,
} from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { money } from "@/lib/format";
import { useApi } from "@/hooks/use-api";

import { PaymentLauncher } from "@/components/members/members-screen";
import { RevenueChart } from "@/components/dashboard/overview";

export function PaymentsScreen() {
  const [search, setSearch] = useState(""),
    [fee, setFee] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [refresh, setRefresh] = useState(0),
    [saved, setSaved] = useState(false);
  const { data, error, loading, refreshing, retry } = useApi<Payment[]>(
    `payments?${new URLSearchParams({ search, fee, from, to })}`,
    refresh,
  );
  const filtersActive = Boolean(search.trim() || fee || from || to);
  const paymentSaved = () => {
    setRefresh((value) => value + 1);
    setSaved(true);
  };
  const clearFilters = () => {
    setSearch("");
    setFee("");
    setFrom("");
    setTo("");
  };
  return (
    <>
      <PageHeader
        title="Payment records"
        description="Review confirmed annual and monthly payments."
        actions={<PaymentLauncher onSuccess={paymentSaved} />}
      />
      {saved && (
        <div className="notice success" role="status">
          Payment confirmed and access dates updated.
        </div>
      )}
      <div
        className="workspace-filters toolbar wrap"
        aria-label="Payment filters"
      >
        <Search value={search} onChange={setSearch} />
        <select
          aria-label="Filter by fee type"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        >
          <option value="">All fee types</option>
          <option value="ANNUAL">Annual membership</option>
          <option value="MONTHLY">Monthly access</option>
        </select>
        <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      <FilterSummary
        count={data?.length}
        filters={[
          search && `Search: ${search}`,
          fee && (fee === "ANNUAL" ? "Annual membership" : "Monthly access"),
          from && `From: ${displayDate(from)}`,
          to && `To: ${displayDate(to)}`,
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
            title={filtersActive ? "No matching payments" : "No payments yet"}
            text={
              filtersActive
                ? "Clear the filters to return to all confirmed payments."
                : "Record a confirmed payment for a registered member to get started."
            }
          >
            {filtersActive ? (
              <button className="button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <PaymentLauncher onSuccess={paymentSaved} />
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
                      <th className="table-supporting">Fee type</th>
                      <th className="table-number">Amount</th>
                      <th className="table-supporting">Method</th>
                      <th className="table-date">Payment date</th>
                      <th className="table-date">Recorded by / time</th>
                      <th className="table-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="person-cell">
                            <Avatar name={p.member_name!} />
                            <div>
                              <strong>{p.member_name}</strong>
                              <small>{p.code}</small>
                            </div>
                          </div>
                        </td>
                        <td className="table-supporting">
                          {p.fee_type === "ANNUAL"
                            ? "Annual membership"
                            : "Monthly access"}
                        </td>
                        <td className="amount table-number">
                          {money(p.amount)}
                        </td>
                        <td className="table-supporting">{p.method}</td>
                        <td className="table-date">
                          {displayDate(p.payment_date)}
                        </td>
                        <td className="table-date">
                          <div className="date-cell">
                            <span>{p.recorder}</span>
                            <small>{dateTime(p.created_at)}</small>
                          </div>
                        </td>
                        <td className="table-status">
                          <span className="payment-status">
                            <CheckCircle size={15} aria-hidden="true" />
                            Confirmed
                          </span>
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
      <p className="page-note">
        Payment dates show when funds were received. Recorded timestamps show
        when your team entered them. Amounts and historical payments cannot be
        edited.
      </p>
    </>
  );
}
export function CheckInsScreen() {
  const [search, setSearch] = useState(""),
    [result, setResult] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [refresh, setRefresh] = useState(0);
  const { data, error, loading, refreshing, retry } = useApi<CheckIn[]>(
    `check-ins?${new URLSearchParams({ search, result, from, to })}`,
    refresh,
  );
  const filtersActive = Boolean(search.trim() || result || from || to);
  const clearFilters = () => {
    setSearch("");
    setResult("");
    setFrom("");
    setTo("");
  };
  return (
    <>
      <PageHeader
        title="Member check-in logs"
        description="Review approved and denied QR scans."
        actions={
          <button
            type="button"
            className="button"
            disabled={loading || refreshing}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh logs
          </button>
        }
      />
      <div
        className="workspace-filters toolbar wrap"
        aria-label="Check-in filters"
      >
        <Search value={search} onChange={setSearch} />
        <select
          aria-label="Filter scan result"
          value={result}
          onChange={(e) => setResult(e.target.value)}
        >
          <option value="">All results</option>
          <option value="APPROVED">Approved</option>
          <option value="DENIED">Denied</option>
        </select>
        <DatePresets from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      <FilterSummary
        count={data?.length}
        filters={[
          search && `Search: ${search}`,
          result && `Result: ${result.toLowerCase()}`,
          from && `From: ${displayDate(from)}`,
          to && `To: ${displayDate(to)}`,
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
            title={filtersActive ? "No matching check-ins" : "No check-ins yet"}
            text={
              filtersActive
                ? "Clear the filters to return to all entry scans."
                : "Scan a member QR to record the first entry attempt."
            }
          >
            {filtersActive ? (
              <button className="button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <Link className="button primary" href="/scan">
                <QrCode size={17} />
                Scan member QR
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
                      <th className="table-date">Date & time</th>
                      <th>Member</th>
                      <th className="table-status">Result</th>
                      <th className="table-supporting">Reason</th>
                      <th className="table-supporting">Scanned by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td className="table-date">
                          <strong>{dateTime(c.scanned_at)}</strong>
                        </td>
                        <td>
                          <div className="date-cell table-identity">
                            <strong>{c.member_name || "Unknown QR"}</strong>
                            <small>{c.code || "No member identified"}</small>
                          </div>
                        </td>
                        <td className="table-status">
                          <Badge
                            tone={
                              c.result === "APPROVED" ? "success" : "danger"
                            }
                          >
                            {c.result === "APPROVED" ? "Approved" : "Denied"}
                          </Badge>
                        </td>
                        <td className="table-supporting">
                          {c.reason || "All entry checks passed"}
                        </td>
                        <td className="table-supporting">{c.scanner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />
        )}
      </section>
      <p className="page-note">
        Each scan is recorded separately. There is no one-check-in-per-day
        restriction.
      </p>
    </>
  );
}
export function AnalyticsScreen() {
  const defaultFrom = addMonths(today(), -6);
  const defaultTo = today();
  const [from, setFrom] = useState(defaultFrom),
    [to, setTo] = useState(defaultTo),
    [fee, setFee] = useState("");
  const { data, error, loading, refreshing, retry } = useApi<
    ReturnType<typeof analytics>
  >(`analytics?${new URLSearchParams({ from, to, fee })}`);
  const filtersActive = Boolean(
    fee || from !== defaultFrom || to !== defaultTo,
  );
  const clearFilters = () => {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setFee("");
  };
  return (
    <>
      <PageHeader
        title="Revenue analytics"
        description="Review confirmed income by payment date."
      />
      <div
        className="workspace-filters report-filters"
        aria-label="Revenue filters"
      >
        <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <select
          aria-label="Filter revenue by fee"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        >
          <option value="">Both fee types</option>
          <option value="ANNUAL">Annual membership</option>
          <option value="MONTHLY">Monthly access</option>
        </select>
      </div>
      <ErrorNotice message={error} onRetry={retry} />
      <RefreshNotice refreshing={refreshing} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="metrics-grid">
              <Metric
                label="Total revenue"
                value={money(data.total)}
                note="Confirmed payments in selected period"
                icon={<Wallet size={21} />}
              />
              <Metric
                label="Annual membership"
                value={money(data.annual)}
                note="Confirmed annual payments"
                icon={<UsersThree size={21} />}
              />
              <Metric
                label="Monthly access"
                value={money(data.monthly)}
                note="Confirmed monthly payments"
                icon={<ChartBar size={21} />}
              />
              <Metric
                label="Payments processed"
                value={data.count}
                note="Each confirmed payment counted once"
                icon={<Receipt size={21} />}
              />
            </div>
            <section className="panel">
              <div className="panel-heading">
                <h2>Monthly revenue</h2>
              </div>
              <RevenueChart
                trend={data.trend}
                emptyAction={
                  filtersActive ? (
                    <button
                      className="button"
                      type="button"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link className="button" href="/payments">
                      View payment records
                    </Link>
                  )
                }
              />
            </section>
            {data.trend.length > 0 && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Period breakdown</h2>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="table-number">Annual membership</th>
                        <th className="table-number">Monthly access</th>
                        <th className="table-number">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trend.map((t) => (
                        <tr key={t.month}>
                          <td>{t.month}</td>
                          <td className="table-number">{money(t.annual)}</td>
                          <td className="table-number">{money(t.monthly)}</td>
                          <td className="amount table-number">
                            {money(t.annual + t.monthly)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )
      )}
      <p className="page-note">
        Cancellation and archiving preserve historical revenue. Pending or
        failed payment attempts are excluded.
      </p>
    </>
  );
}
const label = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
export function ActivitiesScreen() {
  const [category, setCategory] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [actor, setActor] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const { data, error, loading, refreshing, retry } = useApi<
    ReturnType<typeof activities>
  >(
    `activities?${new URLSearchParams({ search, type, actor, from, to, category })}`,
    refresh,
  );
  const filtersActive = Boolean(
    search.trim() || type || actor || from || to || category,
  );
  const clearFilters = () => {
    setSearch("");
    setType("");
    setActor("");
    setFrom("");
    setTo("");
    setCategory("");
  };
  return (
    <>
      <PageHeader
        title="Activity logs"
        description="Review account, navigation, and system activity."
        actions={
          <button
            className="button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh history
          </button>
        }
      />
      <div
        className="workspace-filters toolbar wrap"
        aria-label="Activity filters"
      >
        <Search value={search} onChange={setSearch} />
        <select
          aria-label="Activity type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All activity types</option>
          {data?.types.map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
        <select
          aria-label="Activity category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setType("");
          }}
        >
          <option value="">All history</option>
          <option value="interaction">Navigation & interactions</option>
          <option value="operation">Operational actions</option>
        </select>
        <select
          aria-label="Activity actor"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
        >
          <option value="">All actors</option>
          {data?.actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {data && (
        <>
          <div className="section-caption">
            Today in Asia/Manila · summaries are independent of the filters
            above
          </div>
          <div className="metrics-grid">
            <Metric
              label="Total activities"
              value={data.daily.total}
              note="All activity events recorded today"
              icon={<Clock size={21} />}
            />
            <Metric
              label="Staff logins"
              value={data.daily.staffLogins}
              note="Successful logins with Staff role"
              icon={<UsersThree size={21} />}
            />
            <Metric
              label="Payments processed"
              value={data.daily.payments}
              note="Confirmed payment events recorded today"
              icon={<Receipt size={21} />}
            />
            <Metric
              label="Member edits"
              value={data.daily.memberEdits}
              note="Successful profile edits recorded today"
              icon={<PencilSimple size={21} />}
            />
          </div>
        </>
      )}
      <section className="panel">
        <ErrorNotice message={error} onRetry={retry} />
        <RefreshNotice refreshing={refreshing} />
        {loading ? (
          <Loading />
        ) : !data && error ? null : !data?.records.length ? (
          <Empty
            title={filtersActive ? "No matching activities" : "No activity yet"}
            text={
              filtersActive
                ? "Clear the filters to return to the complete activity history."
                : "New account and operational activity will appear here."
            }
          >
            {filtersActive ? (
              <button className="button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button
                className="button"
                type="button"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Refresh history
              </button>
            )}
          </Empty>
        ) : (
          <Pager
            rows={data.records}
            render={(rows: Activity[]) => (
              <div className="table-scroll">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th className="table-date">Date & time</th>
                      <th>Actor / role</th>
                      <th className="table-supporting">Activity type</th>
                      <th>Description</th>
                      <th className="table-status">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <td className="table-date">{dateTime(a.created_at)}</td>
                        <td>
                          <div className="date-cell table-identity">
                            <strong>{a.actor_name}</strong>
                            <small>{a.actor_role || "System"}</small>
                          </div>
                        </td>
                        <td className="table-supporting">
                          <span
                            className={`audit-event ${/CANCELLED|ARCHIVED/.test(a.event_type) ? "audit-destructive" : /ACCOUNT|PASSWORD|LOGIN|LOGOUT|SESSION/.test(a.event_type) ? "audit-account" : ""}`}
                          >
                            {label(a.event_type)}
                          </span>
                        </td>
                        <td>
                          <div className="activity-description">
                            {a.description.length > 150 ? (
                              <details>
                                <summary>
                                  {a.description.slice(0, 110)}…{" "}
                                  <span className="muted">
                                    Read full record
                                  </span>
                                </summary>
                                <p>{a.description}</p>
                              </details>
                            ) : (
                              a.description
                            )}
                            {a.reason && <small>Reason: {a.reason}</small>}
                          </div>
                        </td>
                        <td className="table-status">
                          <Badge
                            tone={
                              a.outcome === "Failed"
                                ? "danger"
                                : a.outcome === "Pending"
                                  ? "warning"
                                  : a.outcome === "Info"
                                    ? "neutral"
                                    : "success"
                            }
                          >
                            {a.outcome}
                          </Badge>
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
    </>
  );
}
export function StaffScreen({ currentUser }: { currentUser: User }) {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<User>();
  const [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState<User | null | undefined>(),
    [success, setSuccess] = useState("");
  const { data, loading, error, refreshing, retry } = useApi<User[]>(
    "staff",
    refresh,
  );
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const accounts =
    data?.filter((user) => {
      const text =
        `${user.name} ${user.username} ${user.role === "ADMIN" ? "admin administrator" : "staff"} ${user.status}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    }) ?? [];
  return (
    <>
      <PageHeader
        title="Staff & access"
        description="Manage team accounts, roles, and workspace permissions."
        actions={
          <button className="button primary" onClick={() => setEditing(null)}>
            <UserPlus size={18} />
            Add account
          </button>
        }
      />
      {success && (
        <div className="notice success" role="status">
          {success}
        </div>
      )}
      <p className="staff-access-note">
        Staff can manage members, payments, and check-ins. Admins also access
        revenue analytics, Activity Logs, and account controls.
      </p>
      <div
        className="workspace-filters toolbar staff-search-toolbar"
        aria-label="Staff filters"
      >
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Search name, username, role or status…"
        />
        <span className="muted" role="status">
          {data
            ? `${accounts.length} of ${data.length} accounts`
            : "Loading accounts…"}
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Team accounts</h2>
            <p>Role changes and password resets end existing sessions.</p>
          </div>
        </div>
        <ErrorNotice message={error} onRetry={retry} />
        <RefreshNotice refreshing={refreshing} />
        {loading ? (
          <Loading />
        ) : (
          data &&
          (accounts.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th className="table-code">Username</th>
                    <th className="table-supporting">Role</th>
                    <th className="table-status">Status</th>
                    <th className="align-right table-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={u.name} />
                          <strong>
                            {u.name}
                            {u.id === currentUser.id && (
                              <span className="muted"> · You</span>
                            )}
                          </strong>
                        </div>
                      </td>
                      <td className="table-code">{u.username}</td>
                      <td className="table-supporting">
                        <Badge tone={u.role === "ADMIN" ? "blue" : "neutral"}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="table-status">
                        <Badge
                          tone={u.status === "ACTIVE" ? "success" : "danger"}
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="align-right table-action">
                        <div className="table-actions">
                          <button
                            className="button small"
                            onClick={() => setViewing(u)}
                          >
                            View profile
                          </button>
                          <button
                            className="button small"
                            onClick={() => setEditing(u)}
                          >
                            <PencilSimple size={15} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={search.trim() ? "No matching accounts" : "No accounts yet"}
              text={
                search.trim()
                  ? "Try a different name, username, role or status."
                  : "Add an account to get started."
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
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setEditing(null)}
                >
                  <UserPlus size={17} />
                  Add account
                </button>
              )}
            </Empty>
          ))
        )}
      </section>
      {editing !== undefined && (
        <StaffDialog
          user={editing}
          onClose={() => setEditing(undefined)}
          onSuccess={() => {
            setEditing(undefined);
            setRefresh((r) => r + 1);
            setSuccess(
              "Account saved. Access rules are effective immediately.",
            );
          }}
        />
      )}
      {viewing && (
        <Modal title="Staff profile" wide onClose={() => setViewing(undefined)}>
          <div className="modal-body form-stack">
            <div className="profile-top">
              <MemberPhoto member={viewing} resource="staff" />
              <div>
                <h2>{viewing.name}</h2>
                <p>@{viewing.username}</p>
              </div>
              <Badge tone={viewing.status === "ACTIVE" ? "success" : "danger"}>
                {viewing.status}
              </Badge>
            </div>
            <dl className="details-list">
              <dt>Role</dt>
              <dd>{viewing.role === "ADMIN" ? "Administrator" : "Staff"}</dd>
              <dt>Account access</dt>
              <dd>
                {viewing.status === "ACTIVE"
                  ? "Can sign in"
                  : "Sign-in disabled"}
              </dd>
            </dl>
            <p className="muted">
              Passwords are protected and cannot be viewed. Set a new password
              to restore access.
            </p>
            <div className="modal-actions">
              <button
                className="button primary"
                onClick={() => {
                  setEditing(viewing);
                  setViewing(undefined);
                }}
              >
                Edit profile & access
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function StaffDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(user?.status || "ACTIVE");
  const disabling = status === "DISABLED" && user?.status !== "DISABLED";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(user ? `staff/${user.id}` : "staff", {
        method: user ? "PATCH" : "POST",
        body: JSON.stringify({ ...input, confirmed: input.confirmed === "on" }),
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={user ? "Edit account" : "Add team account"}
      protectChanges
      onClose={onClose}
      wide
    >
      <form className="modal-body form-stack" onSubmit={submit}>
        <PhotoField member={user || undefined} resource="staff" />
        <h3>Profile details</h3>
        <label>
          Full name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={user?.name}
          />
        </label>
        <label>
          Username
          <input
            name="username"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9._\-]+"
            defaultValue={user?.username}
            autoComplete="off"
          />
        </label>
        <h3>Password & access</h3>
        <p className="form-footnote">
          Staff can manage members, individual payments, and entry.
          Administrators also manage revenue reports, audit logs, accounts, and
          settings.
        </p>
        <p className="muted">
          A new password ends existing sessions. Existing passwords cannot be
          displayed.
        </p>
        <label>
          {user ? "New password (leave blank to keep current)" : "Password"}
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required={!user}
            minLength={12}
            maxLength={128}
          />
        </label>
        <button
          type="button"
          className="button small"
          aria-pressed={showPassword}
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? "Hide new password" : "Show new password"}
        </button>
        <div className="form-grid">
          <label>
            Role
            <select name="role" defaultValue={user?.role || "STAFF"}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>
            Status
            <select
              name="status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
        </div>
        {disabling && (
          <fieldset className="account-disable form-stack">
            <legend>Confirm account disabling</legend>
            <p>
              {user?.name || "This account"} will be unable to sign in. Existing
              sessions end immediately. An Admin can enable the account again.
            </p>
            <label>
              Reason for disabling
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={500}
                rows={3}
              />
            </label>
            <label className="checkbox-label">
              <input name="confirmed" type="checkbox" required />
              <span>I confirm disabling {user?.name || "this account"}.</span>
            </label>
          </fieldset>
        )}
        <ErrorNotice message={error} />
        <div className="modal-actions">
          <button
            data-discard
            className="button"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          {disabling ? (
            <button
              type="submit"
              className="button danger-button"
              disabled={busy}
            >
              {busy ? "Saving…" : "Disable account"}
            </button>
          ) : (
            <Submit busy={busy}>Save account</Submit>
          )}
        </div>
      </form>
    </Modal>
  );
}
