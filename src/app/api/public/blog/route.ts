import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const tagSlug = searchParams.get("tag");

    const posts = await db.blogPost.findMany({
      where: {
        published: true,
        ...(categorySlug && { category: { slug: categorySlug } }),
        ...(tagSlug && { tags: { some: { tag: { slug: tagSlug } } } }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        author: {
          select: { name: true, photoUrl: true },
        },
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[GET /api/public/blog]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
