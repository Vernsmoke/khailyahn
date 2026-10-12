"use client";
import { useEffect, useRef, useState } from "react";

export function InteractionHistory({ page }: { page: string }) {
  const lastPage = useRef("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    function send(kind: string, label: string, memberId?: string) {
      const body = JSON.stringify({
        id: crypto.randomUUID(),
        page,
        kind,
        label: label.slice(0, 120),
        memberId,
      });
      async function deliver() {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch("/api/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Gym-Request": "1" },
              body,
              keepalive: true,
            });
            if (response.ok) return;
            if (response.status < 500) break;
          } catch {
            /* Retry the same event ID after a transient failure. */
          }
        }
        setFailed(true);
      }
      void deliver();
    }
    if (lastPage.current !== page) {
      lastPage.current = page;
      send("PAGE_VIEWED", page);
    }
    function track(event: Event) {
      const target = (event.target as Element).closest<HTMLElement>(
        "button,a,input,select,textarea",
      );
      if (
        !target ||
        target.closest("[data-history-ignore]") ||
        target.matches(":disabled")
      )
        return;
      const memberId = target.dataset.historyMember;
      const isField = target.matches("input,select,textarea");
      // Read labels only: never record entered values, URLs, QR tokens or credentials.
      const label =
        target.getAttribute("aria-label") ||
        (isField
          ? (target as HTMLInputElement).labels?.[0]?.childNodes[0]?.textContent
          : target.textContent) ||
        target.getAttribute("title") ||
        (isField ? "Form field" : "Control");
      send(
        memberId
          ? "MEMBER_PROFILE_VIEWED"
          : event.type === "change"
            ? "FILTER_CHANGED"
            : "CONTROL_CLICKED",
        label.trim() || "Control",
        memberId,
      );
    }
    document.addEventListener("click", track, true);
    document.addEventListener("change", track, true);
    return () => {
      document.removeEventListener("click", track, true);
      document.removeEventListener("change", track, true);
    };
  }, [page]);
  return failed ? (
    <div className="notice warning" role="status" data-history-ignore>
      Some interaction history could not be saved.{" "}
      <button type="button" onClick={() => setFailed(false)}>
        Dismiss
      </button>
    </div>
  ) : null;
}

