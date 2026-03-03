import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeHandler } from "@/lib/api-helpers";
import { contactSchema } from "@/lib/validations";

export const POST = safeHandler(
  async (_req, { body }) => {
    const submission = await db.contactSubmission.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        subject: body.subject,
        message: body.message,
      },
    });

    return NextResponse.json(
      { id: submission.id, success: true },
      { status: 201 },
    );
  },
  { schema: contactSchema },
);
