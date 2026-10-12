"use client";
import { MemberPhoto } from "@/components/members/member-photo";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  CheckCircle,
  QrCode,
  Scan,
  Stop,
  SpeakerHigh,
  SpeakerSlash,
  XCircle,
} from "@phosphor-icons/react";
import type { IScannerControls } from "@zxing/browser";
import type { CheckIn, Eligibility, MemberView } from "@/lib/types";
import { dateTime, displayDate, manilaDate, today } from "@/lib/dates";
import {
  Avatar,
  Badge,
  Empty,
  ErrorNotice,
  PageHeader,
  Loading,
  RefreshNotice,
} from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { useApi } from "@/hooks/use-api";

import { PaymentDialog } from "@/components/members/members-screen";
import { useScanSounds } from "@/components/check-in/use-scan-sounds";

type ScanResult = Eligibility & { id: string; member?: MemberView };
export function ScanScreen() {
  const sound = useScanSounds();
  const [token, setToken] = useState(""),
    [result, setResult] = useState<ScanResult>(),
    [error, setError] = useState(""),
    [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [paying, setPaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    locked = useRef(false),
    active = useRef(false);
  const resultPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!result) return;
    resultPanel.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 900px)").matches)
      resultPanel.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, [result]);
  const {
    data: recent,
    error: recentError,
    loading: recentLoading,
    refreshing,
    retry,
  } = useApi<CheckIn[]>("check-ins", refresh);
  const repeated =
    result?.member &&
    recent?.some(
      (scan) =>
        scan.id !== result.id &&
        scan.member_id === result.member!.id &&
        manilaDate(scan.scanned_at) === today(),
    );
  useEffect(
    () => () => {
      active.current = false;
      controls.current?.stop();
    },
    [],
  );
  function stop() {
    active.current = false;
    controls.current?.stop();
    controls.current = null;
    setCamera(false);
  }
  async function scan(value: string) {
    if (locked.current) return;
    locked.current = true;
    sound.prepare();
    setBusy(true);
    setError("");
    setResult(undefined);
    stop();
    try {
      const response = await api<ScanResult>("scan", {
        method: "POST",
        body: JSON.stringify({ token: value }),
      });
      setResult(response);
      sound.play(response.approved);
      setRefresh((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  async function start() {
    sound.prepare();
    setError("");
    setResult(undefined);
    setCamera(true);
    active.current = true;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const scanner = await reader.decodeFromVideoDevice(
        undefined,
        video.current!,
        (decoded, _error, scannerControls) => {
          if (decoded && active.current && !locked.current) {
            scannerControls.stop();
            void scan(decoded.getText());
          }
        },
      );
      if (!active.current) scanner.stop();
      else controls.current = scanner;
    } catch {
      active.current = false;
      setCamera(false);
      setError(
        "Camera could not start. Allow camera access or use a QR reader / pasted token below.",
      );
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void scan(token);
  }
  function closeResult() {
    setResult(undefined);
    setToken("");
  }
  return (
    <>
      <PageHeader
        title="Scan member QR"
        description="Check entry eligibility using the member’s QR code or token."
        actions={
          <Badge tone={camera ? "success" : "neutral"}>
            {camera ? "Camera active" : "Scanner ready"}
          </Badge>
        }
      />
      <div className="scan-grid">
        <section className="panel scanner-panel">
          <div className="panel-heading">
            <div>
              <h2>Member QR scanner</h2>
              <p>Position the member’s QR inside the frame.</p>
            </div>
            <QrCode size={24} />
          </div>
          <div className={`camera-box ${camera ? "live" : ""}`}>
            <video
              ref={video}
              muted
              playsInline
              aria-label="Live QR camera feed"
              className={camera ? "" : "hidden"}
            />
            {!camera && (
              <div className="camera-placeholder">
                <Scan size={72} weight="thin" />
                <h3>Ready for the next member.</h3>
                <p>Start the camera to scan their QR code.</p>
              </div>
            )}
            <div className="camera-corners" aria-hidden="true" />
            {camera && (
              <span className="camera-state" role="status">
                Scanning · hold the QR inside the frame
              </span>
            )}
          </div>
          <div className="scanner-controls">
            {camera ? (
              <button className="button scanner-camera-action" onClick={stop}>
                <Stop size={18} />
                Stop camera
              </button>
            ) : (
              <button
                className="button primary scanner-camera-action"
                disabled={busy}
                onClick={start}
              >
                <Camera size={18} />
                Start camera
              </button>
            )}
            <button
              type="button"
              className="button scanner-sound-toggle"
              role="switch"
              aria-label="Scan sounds"
              aria-checked={sound.enabled}
              onClick={sound.toggle}
            >
              {sound.enabled ? (
                <SpeakerHigh size={18} />
              ) : (
                <SpeakerSlash size={18} />
              )}
              {sound.enabled ? "Sound on" : "Sound off"}
            </button>
            <span className="scanner-permission">
              Camera permission required
            </span>
          </div>
          <div className="form-divider" />
          <form className="manual-scan" onSubmit={submit}>
            <label>
              Using a handheld QR reader?
              <span className="muted">
                Scan into this field, or paste a member QR token.
              </span>
              <input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Scan or paste QR token"
                maxLength={12000}
                autoComplete="off"
              />
            </label>
            <button className="button manual-scan-submit" disabled={busy}>
              {busy ? "Checking…" : "Check entry"}
              <Scan size={17} />
            </button>
          </form>
          <ErrorNotice message={error} />
          <p className="scanner-status" role="status">
            {busy
              ? "Checking member eligibility…"
              : error
                ? "Entry was not recorded. Review the error and try again."
                : ""}
          </p>
        </section>
        <div className="scan-aside">
          {result && !paying ? (
            <section
              ref={resultPanel}
              tabIndex={-1}
              className={`panel scan-result ${result.approved ? "approved" : "denied"}`}
              aria-label="Latest scan result"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {result.approved ? (
                <CheckCircle size={42} weight="fill" />
              ) : (
                <XCircle size={42} weight="fill" />
              )}
              <Badge tone={result.approved ? "success" : "danger"}>
                {result.approved ? "ENTRY APPROVED" : "ENTRY DENIED"}
              </Badge>
              <h2>{result.member?.name || "Unknown QR code"}</h2>
              {result.member && <MemberPhoto member={result.member} />}
              <p>{result.reason}</p>
              {!result.approved && /expired/i.test(result.reason) && (
                <strong className="warning-text">
                  Access expired · renewal required
                </strong>
              )}
              {repeated && (
                <p className="notice warning">
                  Repeat scan today. This attempt is recorded separately;
                  multiple check-ins are allowed.
                </p>
              )}
              {result.member && (
                <>
                  <span className="muted">{result.member.code}</span>
                  <dl className="details-list scan-member-details">
                    <dt>Phone</dt>
                    <dd>{result.member.phone}</dd>
                    <dt>Date of birth</dt>
                    <dd>{displayDate(result.member.birth_date)}</dd>
                    <dt>Member status</dt>
                    <dd>
                      {result.member.status === "ARCHIVED"
                        ? "Archived"
                        : "Registered"}
                    </dd>
                  </dl>
                  <div className="result-dates">
                    <span>
                      Annual expiry
                      <strong>
                        {displayDate(result.member.annual?.expires_on)}
                      </strong>
                    </span>
                    <span>
                      Monthly valid through
                      <strong>
                        {displayDate(result.member.monthly?.expires_on)}
                      </strong>
                    </span>
                  </div>
                </>
              )}
              <small>This scan has been saved to Check-In Logs.</small>
              <button type="button" className="button" onClick={closeResult}>
                Scan next member
              </button>
              {result.renewal &&
                result.member &&
                result.member.status !== "ARCHIVED" && (
                  <button
                    className="button primary"
                    onClick={() => setPaying(true)}
                  >
                    Renew{" "}
                    {result.renewal === "ANNUAL"
                      ? "annual membership"
                      : "monthly access"}
                  </button>
                )}
            </section>
          ) : (
            <section className="panel entry-checks">
              <span className="small-icon">
                <CheckCircle size={24} />
              </span>
              <h2>A quick check before entry.</h2>
              <p>We’ll confirm these three things:</p>
              <ol>
                <li>Registered, non-archived member</li>
                <li>Active monthly access</li>
                <li>Active annual membership or valid grace</li>
              </ol>
              <small>
                Cancelled annual membership is never eligible for grace.
              </small>
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>Recent scans</h2>
              <Link className="text-link" href="/check-ins">
                View logs
              </Link>
            </div>
            <ErrorNotice message={recentError} onRetry={retry} />
            <RefreshNotice refreshing={refreshing} />
            {recentLoading ? (
              <Loading />
            ) : !recent && recentError ? null : recent?.length ? (
              recent.slice(0, 4).map((c) => (
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
                title="No scans yet"
                text="Start the camera and scan a member QR to record the first visit."
              >
                {camera ? (
                  <button className="button" type="button" onClick={stop}>
                    <Stop size={17} />
                    Stop camera
                  </button>
                ) : (
                  <button
                    className="button primary"
                    type="button"
                    disabled={busy}
                    onClick={start}
                  >
                    <Camera size={17} />
                    Start camera
                  </button>
                )}
              </Empty>
            )}
          </section>
        </div>
      </div>
      {paying && result?.member && (
        <PaymentDialog
          member={result.member}
          initialFee={result.renewal || "MONTHLY"}
          onClose={() => setPaying(false)}
          onSuccess={() => {
            setPaying(false);
            setResult(undefined);
            setToken("");
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
