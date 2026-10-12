import type { Eligibility, Entitlement, Member } from "./types";
export function eligibility(
  member: Member | undefined,
  annual: Entitlement | undefined,
  monthly: Entitlement | undefined,
  date: string,
): Eligibility {
  const deny = (
    reason: string,
    renewal: "ANNUAL" | "MONTHLY" | null = null,
  ): Eligibility => ({ approved: false, reason, renewal });
  if (!member) return deny("Unknown or unregistered QR code");
  if (member.status === "ARCHIVED") return deny("Member is archived");
  if (!annual) return deny("Annual membership is inactive", "ANNUAL");
  if (annual.status === "CANCELLED")
    return deny("Annual membership is cancelled", "ANNUAL");
  if (date < annual.start_date)
    return deny("Annual membership has not started", "ANNUAL");
  if (date > (annual.grace_end || annual.expires_on))
    return deny("Annual membership expired beyond grace", "ANNUAL");
  if (!monthly) return deny("Monthly access is inactive", "MONTHLY");
  if (monthly.status === "CANCELLED")
    return deny("Monthly access is cancelled", "MONTHLY");
  if (date < monthly.start_date)
    return deny("Monthly access has not started", "MONTHLY");
  if (date > monthly.expires_on)
    return deny("Monthly access has expired", "MONTHLY");
  const grace = date >= annual.expires_on;
  return {
    approved: true,
    reason: grace ? "Entry approved · annual grace period" : "Entry approved",
    renewal: null,
    grace,
  };
}
