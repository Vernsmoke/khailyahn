"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Loading } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  House,
  UsersThree,
  UserPlus,
  ArrowsClockwise,
  Receipt,
  QrCode,
  ClipboardText,
  ChartBar,
  ClockCounterClockwise,
  ShieldCheck,
  GearSix,
  SignOut,
  List,
  X,
  SidebarSimple,
  type IconProps,
} from "@phosphor-icons/react";
import type { User } from "@/lib/types";
import { today, displayDate } from "@/lib/dates";
import { Avatar, ErrorNotice, Modal } from "@/components/ui/primitives";
import { clearRegistrationDrafts } from "@/lib/client/registration-draft";
import { api } from "@/lib/client/api";

import { ThemeToggle } from "@/components/providers/theme";
import { GymLogo } from "@/components/branding/gym-logo";
import { Dock } from "@/components/ui/dock";
import { InteractionHistory } from "@/components/records/interaction-history";
import { GymBackground } from "@/components/ui/gym-background";

const DashboardScreen = dynamic(
  () =>
    import("@/components/dashboard/overview").then(
      (module) => module.DashboardScreen,
    ),
  { loading: () => <Loading kind="dashboard" />, ssr: false },
);
const MembersScreen = dynamic(
  () =>
    import("@/components/members/members-screen").then(
      (module) => module.MembersScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const RegisterScreen = dynamic(
  () =>
    import("@/components/members/members-screen").then(
      (module) => module.RegisterScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const PaymentsScreen = dynamic(
  () =>
    import("@/components/records/records").then(
      (module) => module.PaymentsScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const CheckInsScreen = dynamic(
  () =>
    import("@/components/records/records").then(
      (module) => module.CheckInsScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const AnalyticsScreen = dynamic(
  () =>
    import("@/components/records/records").then(
      (module) => module.AnalyticsScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const ActivitiesScreen = dynamic(
  () =>
    import("@/components/records/records").then(
      (module) => module.ActivitiesScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const StaffScreen = dynamic(
  () =>
    import("@/components/records/records").then((module) => module.StaffScreen),
  { loading: () => <Loading />, ssr: false },
);
const ScanScreen = dynamic(
  () =>
    import("@/components/check-in/scan-screen").then(
      (module) => module.ScanScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);
const SettingsScreen = dynamic(
  () =>
    import("@/components/settings/settings-screen").then(
      (module) => module.SettingsScreen,
    ),
  { loading: () => <Loading />, ssr: false },
);

const navigation: {
  section: string;
  label: string;
  icon: ComponentType<IconProps>;
  admin?: boolean;
  group?: string;
}[] = [
  { section: "dashboard", label: "Overview", icon: House },
  {
    section: "members",
    label: "Members",
    icon: UsersThree,
    group: "Gym operations",
  },
  { section: "register", label: "Register member", icon: UserPlus },
  { section: "renewals", label: "Membership & access", icon: ArrowsClockwise },
  { section: "payments", label: "Payment records", icon: Receipt },
  { section: "scan", label: "Scan member QR", icon: QrCode },
  { section: "check-ins", label: "Check-in logs", icon: ClipboardText },
  {
    section: "analytics",
    label: "Revenue analytics",
    icon: ChartBar,
    admin: true,
    group: "Administration",
  },
  {
    section: "activities",
    label: "Activity logs",
    icon: ClockCounterClockwise,
    admin: true,
  },
  { section: "staff", label: "Staff & access", icon: ShieldCheck, admin: true },
  { section: "settings", label: "Settings", icon: GearSix, admin: true },
];
export function GymApp({
  user,
  section,
  forbidden,
  initialCollapsed,
}: {
  user: User;
  section: string;
  forbidden: boolean;
  initialCollapsed: boolean;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const sidebarRef = useRef<HTMLElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(
    null,
  );
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTooltip = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  }, []);
  useEffect(
    () => () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    },
    [],
  );
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    hideTooltip();
  }
  useEffect(() => {
    document.cookie = `gym-sidebar=${collapsed ? "compact" : "expanded"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, [collapsed]);
  function showTooltip(element: HTMLElement, label: string, immediate = false) {
    hideTooltip();
    if (collapsed && window.matchMedia("(min-width: 901px)").matches) {
      const reveal = () =>
        setTooltip({
          label,
          top: Math.max(
            24,
            Math.min(
              window.innerHeight - 24,
              element.getBoundingClientRect().top + element.offsetHeight / 2,
            ),
          ),
        });
      if (immediate) reveal();
      else tooltipTimer.current = setTimeout(reveal, 180);
    }
  }
  const [mobileOpen, setMobileOpen] = useState(false),
    [logoutError, setLogoutError] = useState("");
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const reset = () => {
      setMobileOpen(false);
      hideTooltip();
    };
    desktop.addEventListener("change", reset);
    return () => desktop.removeEventListener("change", reset);
  }, [hideTooltip]);
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current!;
    const trigger = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"),
      ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      trigger?.focus();
    };
  }, [mobileOpen]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const active = navigation.find((n) => n.section === section)!;
  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api("logout", { method: "POST", body: "{}" });
      clearRegistrationDrafts();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setLogoutError((e as Error).message);
      setLoggingOut(false);
    }
  }
  return (
    <div className={`app-layout ${collapsed ? "nav-collapsed" : ""}`}>
      {!forbidden && <InteractionHistory page={section} />}
      <GymBackground />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Workspace navigation"
        onScroll={hideTooltip}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMobileOpen(false);
            hideTooltip();
          }
        }}
      >
        <button
          type="button"
          className="icon-button sidebar-close"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <Link
          className="brand"
          href="/dashboard"
          aria-label="KHA-IL-YAHN Fitness GYM overview"
        >
          <span className="brand-icon">
            <GymLogo />
          </span>
          <span className="brand-name">
            KHA-IL-YAHN<small>FITNESS GYM</small>
          </span>
        </Link>
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarSimple size={20} />
          <span>Collapse navigation</span>
        </button>
        <Dock>
          {navigation
            .filter((n) => !n.admin || user.role === "ADMIN")
            .map((n) => (
              <div key={n.section}>
                {n.group && <p className="nav-group">{n.group}</p>}
                <Link
                  href={`/${n.section}`}
                  className={`nav-link ${section === n.section ? "active" : ""}`}
                  onClick={() => {
                    setMobileOpen(false);
                    hideTooltip();
                  }}
                  aria-current={section === n.section ? "page" : undefined}
                  aria-label={n.label}
                  aria-describedby={
                    tooltip?.label === n.label
                      ? "navigation-tooltip"
                      : undefined
                  }
                  onMouseEnter={(event) => {
                    showTooltip(event.currentTarget, n.label);
                  }}
                  onMouseLeave={() => {
                    hideTooltip();
                  }}
                  onFocus={(event) => {
                    showTooltip(event.currentTarget, n.label, true);
                  }}
                  onBlur={() => {
                    hideTooltip();
                  }}
                >
                  <span className="nav-icon">
                    <n.icon size={22} weight="regular" aria-hidden="true" />
                  </span>
                  <span className="nav-label">{n.label}</span>
                </Link>
              </div>
            ))}
        </Dock>
        <div className="sidebar-footer">
          <div className="account">
            <Avatar name={user.name} />
            <div className="account-details">
              <strong>{user.name}</strong>
              <small>{user.role === "ADMIN" ? "Administrator" : "Staff"}</small>
            </div>
          </div>
        </div>
      </aside>
      {confirmLogout && (
        <Modal
          title="Sign out?"
          onClose={() => {
            if (!loggingOut) setConfirmLogout(false);
          }}
        >
          <div className="modal-body form-stack" aria-busy={loggingOut}>
            <p>
              You’ll need to sign in again to access the gym workspace. Any
              unsaved changes will be lost.
            </p>
            <ErrorNotice message={logoutError} />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={loggingOut}
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                disabled={loggingOut}
                onClick={signOut}
              >
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {tooltip && (
        <div
          className="sidebar-tooltip"
          role="tooltip"
          id="navigation-tooltip"
          style={{ top: tooltip.top }}
        >
          {tooltip.label}
        </div>
      )}
      <div className="main-area" inert={mobileOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuRef}
              className="icon-button mobile-menu"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="main-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <List size={22} />}
            </button>
            <strong>{active.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="date-display" title="Gym date · Asia/Manila">
              {displayDate(today())} · PHT
            </span>
            <ThemeToggle />
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                setLogoutError("");
                setTooltip(null);
                setConfirmLogout(true);
              }}
            >
              <SignOut size={22} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1} key={section}>
          {forbidden ? (
            <div className="access-denied">
              <ShieldCheck size={48} />
              <h1>Administrator access required</h1>
              <p>This page is available to Admin accounts only.</p>
              <Link className="button primary" href="/dashboard">
                Back to overview
              </Link>
            </div>
          ) : (
            <>
              {section === "dashboard" && <DashboardScreen user={user} />}
              {(section === "members" || section === "renewals") && (
                <MembersScreen renewal={section === "renewals"} />
              )}
              {section === "register" && <RegisterScreen userId={user.id} />}
              {section === "payments" && <PaymentsScreen />}
              {section === "scan" && <ScanScreen />}
              {section === "check-ins" && <CheckInsScreen />}
              {section === "analytics" && <AnalyticsScreen />}
              {section === "activities" && <ActivitiesScreen />}
              {section === "staff" && <StaffScreen currentUser={user} />}
              {section === "settings" && <SettingsScreen />}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>KHA-IL-YAHN Fitness GYM</span>
          <span>All dates use Asia/Manila</span>
        </footer>
        <nav className="mobile-workflow-nav" aria-label="Quick actions">
          <Link
            href="/scan"
            className={section === "scan" ? "active" : ""}
            aria-current={section === "scan" ? "page" : undefined}
          >
            <QrCode size={21} aria-hidden="true" />
            <span>Scan QR</span>
          </Link>
          <Link
            href="/register"
            className={section === "register" ? "active" : ""}
            aria-current={section === "register" ? "page" : undefined}
          >
            <UserPlus size={21} aria-hidden="true" />
            <span>Register member</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
