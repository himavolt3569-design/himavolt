"use server";

import { db } from "@/lib/db";

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
