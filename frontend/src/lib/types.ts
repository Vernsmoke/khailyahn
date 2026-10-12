export type Role = "ADMIN" | "STAFF";
export type User = {
  photo_version?: string;
  id: string;
  username: string;
  name: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
};
export type Member = {
  id: string;
  code: string;
  qr_token: string;
  name: string;
  birth_date: string;
  email: string;
  phone: string;
  address: string;
  emergency_name: string;
  emergency_phone: string;
  blood_type: string;
  status: "REGISTERED" | "ARCHIVED";
  created_at: string;
  updated_at: string;
  created_by: string;
};
export type Entitlement = {
  id: string;
  member_id: string;
  start_date: string;
  expires_on: string;
  grace_end?: string;
  status: "ACTIVE" | "CANCELLED";
};
export type MemberView = Member & {
  photo_version?: string;
  annual?: Entitlement;
  monthly?: Entitlement;
  eligibility: Eligibility;
};
export type Eligibility = {
  approved: boolean;
  reason: string;
  renewal: "ANNUAL" | "MONTHLY" | null;
  grace?: boolean;
};
export type MemberHistoryRecord = {
  id: string;
  event_type: string;
  description: string;
  reason: string | null;
  created_at: string;
};
export type Payment = {
  id: string;
  member_id: string;
  fee_type: "ANNUAL" | "MONTHLY";
  amount: number;
  method: string;
  payment_date: string;
  recorded_by: string;
  created_at: string;
  idempotency_key: string;
  request_hash: string;
  period_start: string;
  period_end: string;
  member_name?: string;
  code?: string;
  recorder?: string;
};
export type CheckIn = {
  id: string;
  member_id: string | null;
  scanned_at: string;
  result: "APPROVED" | "DENIED";
  reason: string | null;
  renewal: string | null;
  member_name: string | null;
  code: string | null;
  scanner: string;
};
export type Activity = {
  id: string;
  actor_name: string;
  actor_role: Role | null;
  event_type: string;
  description: string;
  outcome: string;
  reason: string | null;
  created_at: string;
};
