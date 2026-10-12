"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";

type NavigationEvent = Event & {
  navigationType: string;
  canIntercept: boolean;
  destination: { key: string };
};
type BrowserNavigation = EventTarget & { traverseTo: (key: string) => unknown };

export function useUnsavedChanges(
  root: RefObject<HTMLDialogElement | null>,
  enabled: boolean,
) {
  const router = useRouter();
  const baseline = useRef("");
  const bypass = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  function snapshot() {
    const form = root.current?.querySelector("form");
    if (!form) return "";
    return JSON.stringify(
      [...new FormData(form)].map(([name, value]) => [
        name,
        typeof value === "string"
          ? value
          : `${value.name}:${value.size}:${value.lastModified}`,
      ]),
    );
  }
  function dirty() {
    return enabled && !bypass.current && baseline.current !== snapshot();
  }
  function request(action: () => void) {
    if (dirty()) setPending(() => action);
    else action();
  }
  useEffect(() => {
    baseline.current = snapshot();
    bypass.current = false;
    if (!enabled) return;
    function unload(event: BeforeUnloadEvent) {
      if (dirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function click(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target as Element;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href);
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        return;
      if (!dirty()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPending(() => () => {
        if (url.origin === location.origin)
          router.push(url.pathname + url.search + url.hash);
        else location.assign(url.href);
      });
    }
    // Cancellable history traversal in browsers with the Navigation API.
    const navigation = (window as Window & { navigation?: BrowserNavigation })
      .navigation;
    function navigate(event: Event) {
      const e = event as NavigationEvent;
      if (
        e.navigationType === "traverse" &&
        e.cancelable &&
        e.canIntercept &&
        dirty()
      ) {
        e.preventDefault();
        setPending(() => () => {
          navigation?.traverseTo(e.destination.key);
        });
      }
    }
    const clear = () => {
      bypass.current = true;
    };
    window.addEventListener("gym-session-cleared", clear);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("gym-session-cleared", clear);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", navigate);
    };
    // The baseline must only reset when editing starts, not on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, router]);
  return {
    request,
    pending,
    keep: () => setPending(null),
    discard: () => {
      const action = pending;
      setPending(null);
      bypass.current = true;
      action?.();
    },
  };
}
