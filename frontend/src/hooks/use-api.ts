"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
export function useApi<T>(path: string, refresh = 0) {
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${refresh}:${attempt}`;
  const [state, setState] = useState<{
    key: string;
    path: string;
    data?: T;
    error: string;
  }>({
    key: "",
    path: "",
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key, path, data, error: "" });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            path,
            data: previous.path === path ? previous.data : undefined,
            error: e.message,
          }));
      });
    return () => controller.abort();
  }, [path, key]);
  const data = state.path === path ? state.data : undefined;
  return {
    data,
    error: state.key === key ? state.error : "",
    loading: state.key !== key && !data,
    refreshing: state.key !== key && Boolean(data),
    retry: () => setAttempt((value) => value + 1),
  };
}
