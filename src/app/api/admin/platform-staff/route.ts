import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { supabaseAdmin, FOOD_IMAGES_BUCKET } from "@/lib/supabase";

/**
 * GET /api/admin/platform-staff
 * List all platform staff
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  // Defaulting to letting root or those with perm see it. 
  // If we don't have full granular perms setup yet, requireAdminPermission allows MASTER_ADMIN.
  if (!admin) return unauthorized("Permission denied");

  const staff = await db.platformStaff.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      // `permissions` so the list can show what each person can actually do,
      // rather than a role name that means nothing without opening Roles.
      role: { select: { id: true, name: true, permissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

/**
 * POST /api/admin/platform-staff
 * Create a new platform staff member
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  if (!admin) return unauthorized("Permission denied");

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string | null;
  const roleId = formData.get("roleId") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const photoFile = formData.get("photoFile") as File | null;
  const tenantScopesRaw = formData.get("tenantScopes") as string | null;
  const tenantScopes = tenantScopesRaw ? JSON.parse(tenantScopesRaw) : [];

  if (!name || !email || !roleId || !phoneNumber) {
    return NextResponse.json({ error: "Name, email, phone number, and role are required" }, { status: 400 });
  }

  const existing = await db.platformStaff.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "You cannot create because it's already there (Email matches another staff member)" }, { status: 400 });
  }

  let finalPassword = password;
  let generatedPassword = null;
  if (!finalPassword) {
    // Generate a random 10-character password (alphanumeric)
    finalPassword = Math.random().toString(36).slice(-10);
    generatedPassword = finalPassword;
  }

  const passwordHash = bcrypt.hashSync(finalPassword, 10);

  try {
    let finalPhotoUrl = null;
    if (photoFile) {
      console.log("Uploading photo...");
      const arrayBuffer = await photoFile.arrayBuffer();
      const fileExt = photoFile.name.split('.').pop() || "jpg";
      const fileName = `staff/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from(FOOD_IMAGES_BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: photoFile.type || "image/jpeg",
          upsert: false
        });
        
      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
      }
      
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(FOOD_IMAGES_BUCKET)
        .getPublicUrl(fileName);
        
      finalPhotoUrl = publicUrlData.publicUrl;
      console.log("Photo uploaded:", finalPhotoUrl);
    }

    console.log("Creating platform staff with roleId:", roleId);
    const staff = await db.platformStaff.create({
      data: {
        name,
        email,
        phoneNumber,
        photoUrl: finalPhotoUrl,
        passwordHash,
        roleId,
        assignedTenants: tenantScopes?.length ? {
          create: tenantScopes.map((restaurantId: string) => ({ restaurantId }))
        } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { id: true, name: true } },
      }
    });

    console.log("Creating audit log...");
    await db.auditLog.create({
      data: {
        action: "CREATE_PLATFORM_STAFF",
        entity: "PlatformStaff",
        entityId: staff.id,
        platformStaffId: admin.staffId || null,
        detail: `Created new Platform Staff: ${staff.name} (${staff.email})`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      }
    });

    console.log("Success!");
    return NextResponse.json({ ...staff, generatedPassword });
  } catch (error) {
    console.error("Failed to create platform staff (detailed):", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to create platform staff: ${detail}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  if (!admin) return unauthorized("Permission denied");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
  }

  try {
    const staff = await db.platformStaff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    await db.platformStaff.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        action: "DELETE_PLATFORM_STAFF",
        entity: "PlatformStaff",
        entityId: id,
        platformStaffId: admin.staffId || null,
        detail: `Permanently deleted Platform Staff: ${staff.name} (${staff.email})`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete platform staff" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  if (!admin) return unauthorized("Permission denied");

  try {
    const { id, name, email, phoneNumber, roleId } = await req.json();

    if (!id || !name || !email || !roleId || !phoneNumber) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Check if email belongs to someone else
    const existing = await db.platformStaff.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Email already in use by another staff member" }, { status: 400 });
    }

    const updated = await db.platformStaff.update({
      where: { id },
      data: { name, email, phoneNumber, roleId },
      include: { role: { select: { id: true, name: true } } }
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_PLATFORM_STAFF",
        entity: "PlatformStaff",
        entityId: id,
        platformStaffId: admin.staffId || null,
        detail: `Updated Platform Staff: ${updated.name} (${updated.email})`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update platform staff" }, { status: 500 });
  }
}

