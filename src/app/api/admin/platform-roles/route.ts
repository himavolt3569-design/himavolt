import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/api-helpers";
import { PERMISSION_IDS, canonicalPermission } from "@/lib/platform-permissions";

/**
 * Validate a submitted permission list against the catalogue.
 *
 * Storing an id nothing checks is worse than storing nothing: the role looks
 * like it grants something and silently does not. Legacy spellings are folded
 * to their canonical form on the way in, so editing an old role also migrates
 * it.
 */
function normalisePermissions(
  input: unknown,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.some((p) => typeof p !== "string")) {
    return { ok: false, error: "Permissions must be a list." };
  }
  const canonical = [...new Set((input as string[]).map(canonicalPermission))];
  const unknown = canonical.filter((p) => !PERMISSION_IDS.includes(p));
  if (unknown.length) {
    return { ok: false, error: `Unknown permission(s): ${unknown.join(", ")}` };
  }
  if (canonical.length === 0) {
    return { ok: false, error: "Pick at least one permission." };
  }
  return { ok: true, value: canonical };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_roles.manage");
  if (!admin) return unauthorized("Permission denied");

  const roles = await db.platformRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true } } },
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

  const checked = normalisePermissions(permissions);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  try {
    const role = await db.platformRole.create({
      data: { name, description, permissions: checked.value },
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

/**
 * PATCH — edit an existing role.
 *
 * Roles could previously only be created, never changed, so adding a newly
 * introduced permission to an existing role meant rebuilding it from scratch
 * and reassigning every staff member.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_roles.manage");
  if (!admin) return unauthorized("Permission denied");

  const { id, name, description, permissions } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Role id is required" }, { status: 400 });
  }

  const existing = await db.platformRole.findUnique({
    where: { id },
    select: { id: true, name: true, permissions: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof description === "string") data.description = description.trim();

  if (permissions !== undefined) {
    const checked = normalisePermissions(permissions);
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    data.permissions = checked.value;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const role = await db.platformRole.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        action: "UPDATE_PLATFORM_ROLE",
        entity: "PlatformRole",
        entityId: role.id,
        platformStaffId: admin.staffId || null,
        detail: `Updated Platform Role: ${role.name} (${Object.keys(data).join(", ")})`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      return NextResponse.json(
        { error: "A role with this name already exists." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
  }
}

/** DELETE — remove a role, unless staff are still assigned to it. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_roles.manage");
  if (!admin) return unauthorized("Permission denied");

  const { id } = await req.json().catch(() => ({}));
  if (!id) {
    return NextResponse.json({ error: "Role id is required" }, { status: 400 });
  }

  const role = await db.platformRole.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { staff: true } } },
  });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // `PlatformStaff.roleId` is a required relation, so deleting a role in use
  // would fail at the database anyway — say why instead of surfacing a raw
  // foreign-key error.
  if (role._count.staff > 0) {
    return NextResponse.json(
      {
        error: `${role._count.staff} staff member(s) still use this role. Move them to another role first.`,
      },
      { status: 409 },
    );
  }

  await db.platformRole.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "DELETE_PLATFORM_ROLE",
      entity: "PlatformRole",
      entityId: id,
      platformStaffId: admin.staffId || null,
      detail: `Deleted Platform Role: ${role.name}`,
      ipAddress: req.headers.get("x-forwarded-for") || null,
    },
  });

  return NextResponse.json({ deleted: true });
}
