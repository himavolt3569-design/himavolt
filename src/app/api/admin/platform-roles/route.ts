import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_roles.manage");
  if (!admin) return unauthorized("Permission denied");

  const roles = await db.platformRole.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_roles.manage");
  if (!admin) return unauthorized("Permission denied");

  const { name, description, permissions } = await req.json();

  if (!name || !permissions) {
    return NextResponse.json({ error: "Name and permissions are required" }, { status: 400 });
  }

  try {
    const role = await db.platformRole.create({
      data: { name, description, permissions },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_PLATFORM_ROLE",
        entity: "PlatformRole",
        entityId: role.id,
        platformStaffId: admin.staffId || null,
        detail: `Created new Platform Role: ${role.name}`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      }
    });

    return NextResponse.json(role);
  } catch (error) {
    // P2002 = Prisma unique-constraint violation.
    if ((error as { code?: string } | null)?.code === 'P2002') {
      return NextResponse.json({ error: "A role with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create role." }, { status: 500 });
  }
}
