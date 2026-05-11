import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeHandler } from "@/lib/api-helpers";
import { contactSchema } from "@/lib/validations";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const POST = safeHandler(
  async (req, { body }) => {
    const rl = await rateLimit(clientKey(req, "contact"), 15 * 60_000, 5);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

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
