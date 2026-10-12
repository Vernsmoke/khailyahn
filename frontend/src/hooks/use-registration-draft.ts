"use client";
import { useEffect, useRef, useState } from "react";
import {
  clearRegistrationDraft,
  readRegistrationDraft,
  saveRegistrationDraft,
} from "@/lib/client/registration-draft";

const fields = [
  "name",
  "birth_date",
  "phone",
  "email",
  "address",
  "emergency_name",
  "emergency_phone",
  "blood_type",
  "photo",
];
export function useRegistrationDraft(userId: string, ready: boolean) {
  const [initial] = useState(() => readRegistrationDraft(userId));
  const [key] = useState(() => initial?.key || crypto.randomUUID());
  const [monthlyKey] = useState(
    () => initial?.monthlyKey || crypto.randomUUID(),
  );
  const form = useRef<HTMLFormElement>(null);
  const completed = useRef(false);
  const [status, setStatus] = useState(
    initial?.memoryOnly
      ? "Draft kept in memory only. Browser storage is unavailable; refreshing or closing this tab may lose it."
      : initial
        ? "Unfinished registration restored. Confirm payment again before registering."
        : "",
  );
  useEffect(() => {
    const node = form.current;
    if (!ready || !node) return;
    let previous = JSON.stringify(initial?.fields || {});
    let failed = Boolean(initial?.memoryOnly);
    function save() {
      if (completed.current || !node) return;
      const data = new FormData(node);
      const values = Object.fromEntries(
        fields.flatMap((name) => {
          const value = data.get(name);
          return typeof value === "string" && value ? [[name, value]] : [];
        }),
      );
      const serialized = JSON.stringify(values);
      if (serialized === previous) return;
      previous = serialized;
      try {
        if (Object.keys(values).length)
          saveRegistrationDraft(userId, { fields: values, key, monthlyKey });
        else clearRegistrationDraft(userId);
        failed = false;
        setStatus(Object.keys(values).length ? "Draft saved in this tab." : "");
      } catch {
        failed = true;
        setStatus(
          "Draft kept in memory only. Browser storage is unavailable; refreshing or closing this tab may lose it.",
        );
      }
    }
    const changed = () => queueMicrotask(save);
    const unload = (event: BeforeUnloadEvent) => {
      save();
      if (failed && !completed.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    node.addEventListener("input", changed);
    node.addEventListener("change", changed);
    const observer = new MutationObserver(save);
    observer.observe(node, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["value"],
    });
    window.addEventListener("beforeunload", unload);
    const clear = () => {
      completed.current = true;
    };
    window.addEventListener("gym-session-cleared", clear);
    return () => {
      save();
      observer.disconnect();
      node.removeEventListener("input", changed);
      node.removeEventListener("change", changed);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("gym-session-cleared", clear);
    };
  }, [ready, initial, key, monthlyKey, userId]);
  return {
    form,
    initial,
    key,
    monthlyKey,
    status,
    clear: () => {
      completed.current = true;
      clearRegistrationDraft(userId);
    },
  };
}
