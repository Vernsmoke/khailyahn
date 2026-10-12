import { clearRegistrationDrafts } from "@/lib/client/registration-draft";
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Gym-Request": "1", ...options?.headers },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("login")) {
      clearRegistrationDrafts();
      // A full navigation clears stale account data after session revocation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

