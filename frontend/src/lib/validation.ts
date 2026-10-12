import { z } from "zod";
import { today } from "./dates";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => {
    const parsed = new Date(v + "T00:00:00Z");
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
  }, "Invalid calendar date");
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(24)
  .regex(/^[+\d ()-]+$/, "Invalid phone number");
export const memberSchema = z.object({
  photo: z
    .string()
    .max(1400000)
    .regex(/^(data:image\/jpeg;base64,[A-Za-z0-9+/=]+)?$/, "Invalid photo")
    .optional(),
  name: z.string().trim().min(2).max(100),
  birth_date: dateSchema.refine(
    (v) => v <= today() && v >= "1900-01-01",
    "Enter a valid birth date",
  ),
  email: z.union([z.literal(""), z.email()]).default(""),
  phone,
  address: z.string().trim().min(3).max(300),
  emergency_name: z.string().trim().min(2).max(100),
  emergency_phone: phone,
  blood_type: z
    .enum(["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .default(""),
});
export const paymentSchema = z.object({
  expected_amount: z.number().int().positive().optional(),
  fee_type: z.enum(["ANNUAL", "MONTHLY"]),
  method: z.enum(["Cash", "GCash", "Other"]),
  payment_date: dateSchema.refine(
    (v) => v <= today() && v >= "2000-01-01",
    "Payment date must not be in the future",
  ),
  confirmed: z.literal(true, {
    error: "Confirm receipt of payment before continuing",
  }),
  idempotency_key: z.uuid(),
});
export const cancellationSchema = z.object({
  action: z.enum(["ANNUAL", "MONTHLY", "ARCHIVE"]),
  reason: z
    .string()
    .trim()
    .min(3, "A reason is required (at least 3 characters)")
    .max(500),
  confirmed: z.literal(true, {
    error: "Confirm this action before continuing",
  }),
});
export const staffSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  confirmed: z.boolean().optional(),
  photo: memberSchema.shape.photo,
  name: z.string().trim().min(2).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9._-]+$/),
  role: z.enum(["ADMIN", "STAFF"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
  password: z.string().max(128).optional(),
});
