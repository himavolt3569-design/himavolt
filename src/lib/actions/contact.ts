"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

/** Contact submission lifecycle. Stored as a free string on the row. */
export const CONTACT_STATUSES = ["new", "read", "replied", "archived"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/**
 * Public — called from the contact page. Anyone may submit; no auth.
 */
export async function submitContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  if (!data.name || !data.email || !data.subject || !data.message) {
    throw new Error("Missing required fields");
  }

  const submission = await db.contactSubmission.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
    },
  });

  return { id: submission.id, success: true };
}

/**
 * The admin actions below all read/mutate every customer's contact details
 * (name, email, phone, message = PII), so they MUST be master-admin gated.
 * Server actions are reachable POST endpoints, so without this guard any
 * visitor could invoke them.
 */
async function assertAdmin() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
}

export async function getContactSubmissions() {
  await assertAdmin();
  const submissions = await db.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
  return submissions;
}

export async function setContactStatus(id: string, status: string) {
  await assertAdmin();
  if (!CONTACT_STATUSES.includes(status as ContactStatus)) {
    throw new Error("Invalid status");
  }
  await db.contactSubmission.update({
    where: { id },
    data: { status },
  });
  return { success: true };
}

export async function deleteContactSubmission(id: string) {
  await assertAdmin();
  await db.contactSubmission.delete({ where: { id } });
  return { success: true };
}
