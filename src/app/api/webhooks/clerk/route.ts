import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(SIGNING_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;

    const email = email_addresses[0]?.email_address ?? "";
    const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || "User";
    const phone = phone_numbers?.[0]?.phone_number;

    await db.user.upsert({
      where: { id },
      update: { email, name, phone, imageUrl: image_url },
      create: { id, email, name, phone, imageUrl: image_url },
    });

    logAudit({
      action: eventType === "user.created" ? "USER_CREATED" : "USER_UPDATED",
      entity: "User",
      entityId: id,
      detail: `User "${name}" ${eventType === "user.created" ? "registered" : "updated profile"}`,
      metadata: { email, name },
      userId: id,
    });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      logAudit({
        action: "USER_DELETED",
        entity: "User",
        entityId: id,
        detail: `User account deleted`,
        userId: id,
      });

      await db.user.delete({ where: { id } }).catch((err: unknown) => {
        // User may not exist in our DB yet (e.g. never completed sign-up)
        console.warn("[Webhook] user.deleted — user not found in DB:", err);
      });
    }
  }

  return NextResponse.json({ received: true });
}
