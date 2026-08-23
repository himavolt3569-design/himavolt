import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tags = await db.blogTag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { posts: true } }
      }
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error("[GET /api/admin/blog/tags]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.blogTag.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Tag slug already exists" }, { status: 400 });
    }

    const tag = await db.blogTag.create({
      data: { name, slug },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/blog/tags]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
