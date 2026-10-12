const prefix = "gym-registration-draft:";
export type RegistrationDraft = {
  fields: Record<string, string>;
  key: string;
  monthlyKey: string;
  memoryOnly?: boolean;
};
const memory = new Map<string, RegistrationDraft>();
export function readRegistrationDraft(
  userId: string,
): RegistrationDraft | undefined {
  if (memory.has(userId)) return memory.get(userId);
  try {
    const value = JSON.parse(sessionStorage.getItem(prefix + userId) || "null");
    if (
      value &&
      typeof value.key === "string" &&
      typeof value.monthlyKey === "string" &&
      value.fields &&
      Object.values(value.fields).every((field) => typeof field === "string")
    )
      return value;
  } catch {
    /* Storage may be unavailable; navigation can still use memory. */
  }
  return memory.get(userId);
}
export function saveRegistrationDraft(
  userId: string,
  draft: RegistrationDraft,
) {
  memory.set(userId, { ...draft, memoryOnly: true });
  sessionStorage.setItem(prefix + userId, JSON.stringify(draft));
  memory.set(userId, draft);
}
export function clearRegistrationDraft(userId: string) {
  memory.delete(userId);
  try {
    sessionStorage.removeItem(prefix + userId);
  } catch {
    /* Unavailable storage. */
  }
}
export function clearRegistrationDrafts() {
  window.dispatchEvent(new Event("gym-session-cleared"));
  memory.clear();
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* Unavailable storage. */
  }
}
