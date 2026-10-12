"use client";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  QrCode,
  UsersThree,
  Wallet,
  UserPlus,
  Clock,
  CheckCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import type { User } from "@/lib/types";
import type { ReactNode } from "react";
import type { dashboard, analytics } from "@/lib/server/reports";
import { dateTime, displayDate, today } from "@/lib/dates";
import {
  Avatar,
  Badge,
  Empty,
  ErrorNotice,
  Loading,
  Metric,
  PageHeader,
  RefreshNotice,
} from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { useApi } from "@/hooks/use-api";

export function RevenueChart({
  trend,
  emptyAction,
}: {
  trend: ReturnType<typeof analytics>["trend"];
  emptyAction?: ReactNode;
}) {
  if (!trend.length)
    return (
      <Empty
        title="No confirmed payments yet"
        text="Confirmed annual and monthly payments will appear in this chart."
      >
        {emptyAction}
      </Empty>
    );
  const peak = Math.max(...trend.flatMap((t) => [t.annual, t.monthly]), 1);
  const x = (index: number) =>
    trend.length === 1 ? 300 : 12 + (index * 576) / (trend.length - 1);
  const y = (value: number) => 154 - (value / peak) * 140;
  const path = (fee: "annual" | "monthly") =>
    trend
      .map((point, index) => {
        if (!index) return `M ${x(index)} ${y(point[fee])}`;
        const middle = (x(index - 1) + x(index)) / 2;
        return `C ${middle} ${y(trend[index - 1][fee])}, ${middle} ${y(point[fee])}, ${x(index)} ${y(point[fee])}`;
      })
      .join(" ");
  const lastPoint = trend.at(-1)!;
  const endLabels = (["annual", "monthly"] as const)
    .map((fee) => ({ fee, y: y(lastPoint[fee]) }))
    .sort((a, b) => a.y - b.y);
  const minimumLabelGap = 22;
  if (endLabels[1].y - endLabels[0].y < minimumLabelGap) {
    const midpoint = (endLabels[0].y + endLabels[1].y) / 2;
    endLabels[0].y = Math.max(
      12,
      Math.min(midpoint - minimumLabelGap / 2, 154 - minimumLabelGap),
    );
    endLabels[1].y = endLabels[0].y + minimumLabelGap;
  }
  return (
    <div
      className="revenue-chart"
      role="group"
      aria-label="Monthly revenue: solid line for annual membership, dashed line for monthly access"
    >
      <div className="chart-axis">
        <span>{money(peak)}</span>
        <span>{money(peak / 2)}</span>
        <span>₱0</span>
      </div>
      <div className="line-chart-plot">
        <svg
          viewBox="0 0 600 166"
          preserveAspectRatio="none"
          className="revenue-lines"
          aria-label="Confirmed revenue trends"
        >
          {[14, 84, 154].map((height) => (
            <line
              key={height}
              x1="0"
              x2="600"
              y1={height}
              y2={height}
              className="revenue-grid"
            />
          ))}
          {(["annual", "monthly"] as const).map((fee) => (
            <g key={fee} className={`revenue-series ${fee}-series`}>
              <path
                d={`${path(fee)} L ${x(trend.length - 1)} 154 L ${x(0)} 154 Z`}
                className="revenue-area"
              />
              <path d={path(fee)} className="revenue-line" />
              {trend.map((point, index) => (
                <circle
                  key={point.month}
                  cx={x(index)}
                  cy={y(point[fee])}
                  r="3.5"
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.month}, ${fee}: ${money(point[fee])}`}
                >
                  <title>{`${point.month}: ${fee === "annual" ? "Annual membership" : "Monthly access"} ${money(point[fee])}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
        <div className="revenue-end-labels" aria-hidden="true">
          {endLabels.map(({ fee, y: labelY }) => (
            <span
              key={fee}
              className={`revenue-end-label ${fee}-label`}
              style={{ top: `${(labelY / 166) * 100}%` }}
            >
              {fee === "annual" ? "Annual" : "Monthly"}
            </span>
          ))}
        </div>
        <div className="line-chart-labels">
          {trend.map((t) => (
            <span key={t.month}>
              {new Intl.DateTimeFormat("en", {
                month: "short",
                year: "2-digit",
                timeZone: "UTC",
              }).format(new Date(t.month + "-01T00:00:00Z"))}
            </span>
          ))}
        </div>
      </div>
      <details className="chart-text-summary">
        <summary>View chart values</summary>
        <table>
          <caption>Confirmed revenue by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th className="table-number">Annual membership</th>
              <th className="table-number">Monthly access</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.month}>
                <th scope="row">{point.month}</th>
                <td className="table-number">{money(point.annual)}</td>
                <td className="table-number">{money(point.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
export function DashboardScreen({ user }: { user: User }) {
  const { data, error, loading, refreshing, retry } =
    useApi<ReturnType<typeof dashboard>>("dashboard");
  if (loading) return <Loading kind="dashboard" />;
  if (!data) return <ErrorNotice message={error} onRetry={retry} />;
  const admin = "analytics" in data;
  const revenue = admin ? data.analytics : undefined;
  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="Your gym at a glance."
        actions={
          <>
            <Link className="button" href="/scan">
              <QrCode size={18} />
              Scan QR
            </Link>
            <Link className="button primary" href="/register">
              <UserPlus size={18} />
              Register member
            </Link>
          </>
        }
      />
      <ErrorNotice message={error} onRetry={retry} />
      <RefreshNotice refreshing={refreshing} />
      <div className="metrics-grid">
        <Metric
          label="Registered members"
          value={data.members.toLocaleString()}
          icon={<UsersThree size={21} />}
        />
        <Metric
          label="Ready for entry"
          priority
          value={data.eligible.toLocaleString()}
          icon={<CalendarCheck size={21} />}
        />
        <Metric
          label="Today’s check-ins"
          priority
          value={data.checkIns.toLocaleString()}
          note={`${data.denied} denied scan${data.denied === 1 ? "" : "s"} today`}
          icon={<QrCode size={21} />}
        />
        <Metric
          label={admin ? "Today’s revenue" : "Annual renewal alerts"}
          value={admin ? money(data.revenueToday ?? 0) : data.alertsCount}
          note={
            admin
              ? "Confirmed payments dated today"
              : "Expired or due within 14 days"
          }
          icon={admin ? <Wallet size={21} /> : <Clock size={21} />}
        />
      </div>
      <div className="dashboard-grid operational-dashboard">
        <section className="panel alerts-panel">
          <div className="panel-heading">
            <div>
              <h2>Membership watch</h2>
              <p>
                {data.alertsCount} annual renewals to review · earliest expiry
                first.
              </p>
            </div>
            <span className="small-icon">
              <Clock size={20} />
            </span>
          </div>
          {data.alerts.length ? (
            <div className="alert-list">
              {[...data.alerts]
                .sort((a, b) =>
                  a.annual!.expires_on.localeCompare(b.annual!.expires_on),
                )
                .map((m) => (
                  <Link href="/renewals" key={m.id} className="alert-item">
                    <Avatar name={m.name} />
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.code}</small>
                    </div>
                    <div className="alert-status">
                      <Badge
                        tone={
                          m.annual!.expires_on <= today()
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {m.annual!.grace_end! < today()
                          ? "Expired"
                          : m.annual!.expires_on <= today()
                            ? "In grace"
                            : "Due soon"}
                      </Badge>
                      <small>{displayDate(m.annual!.expires_on)}</small>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <Empty
              title="All caught up"
              text="No annual renewals due in the next 14 days."
            />
          )}
          <Link className="panel-footer-link" href="/renewals">
            Manage membership & access
            <ArrowRight size={17} />
          </Link>
        </section>
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>{admin ? "Revenue overview" : "Weekly check-ins"}</h2>
            </div>
            {admin && (
              <Link className="text-link" href="/analytics">
                View report
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
          {revenue ? (
            <>
              <div className="chart-summary">
                <strong>{money(revenue.total)}</strong>
                <span>all-time revenue</span>
              </div>
              <RevenueChart
                trend={revenue.trend.slice(-6)}
                emptyAction={
                  <Link className="button" href="/register">
                    <UserPlus size={17} />
                    Register member
                  </Link>
                }
              />
            </>
          ) : (
            <div className="visit-chart">
              {data.visits.map((v) => (
                <div key={v.date}>
                  <strong>{v.count}</strong>
                  <div
                    style={{
                      height: `${Math.max(4, (v.count / Math.max(...data.visits.map((i) => i.count), 1)) * 150)}px`,
                    }}
                  />
                  <span>
                    {new Intl.DateTimeFormat("en", {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(new Date(v.date + "T00:00:00Z"))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent payments</h2>
          </div>
          <Link className="text-link" href="/payments">
            View all payments
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {data.payments.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="table-supporting">Fee type</th>
                  <th className="table-date">Payment date</th>
                  <th className="table-supporting">Method</th>
                  <th className="table-number">Amount</th>
                  <th className="table-status">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
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
                    <td className="table-date">
                      {displayDate(p.payment_date)}
                    </td>
                    <td className="table-supporting">{p.method}</td>
                    <td className="amount table-number">{money(p.amount)}</td>
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
        ) : (
          <Empty
            title="No payments recorded"
            text="Register your first member to record an annual payment."
          >
            <Link className="button primary" href="/register">
              <UserPlus size={17} />
              Register member
            </Link>
          </Empty>
        )}
      </section>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent check-ins</h2>
            </div>
            <Link href="/check-ins" className="text-link">
              View logs
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {data.recent.length ? (
            data.recent.slice(0, 3).map((c) => (
              <div className="recent-scan" key={c.id}>
                <Avatar name={c.member_name || "Unknown QR"} />
                <div>
                  <strong>{c.member_name || "Unknown QR"}</strong>
                  <small>{dateTime(c.scanned_at)}</small>
                </div>
                <Badge tone={c.result === "APPROVED" ? "success" : "danger"}>
                  {c.result === "APPROVED" ? "Approved" : "Denied"}
                </Badge>
              </div>
            ))
          ) : (
            <Empty
              title="The door is ready"
              text="Your first scan will appear here."
            >
              <Link className="button" href="/scan">
                <QrCode size={17} />
                Scan member QR
              </Link>
            </Empty>
          )}
        </section>
        <section className="quick-panel">
          <ArrowsClockwise size={28} weight="duotone" />
          <div>
            <h2>Membership & access</h2>
          </div>
          <Link href="/renewals" className="button">
            Manage access
            <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      {data.demo && <small className="muted">Sample data</small>}
    </>
  );
}

