import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { title, slug, excerpt, content, coverImageUrl, videoUrl, published, categoryId, tagIds } = body;

    // We must ensure the post exists
    const existingPost = await db.blogPost.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check slug uniqueness if slug changed
    if (slug && slug !== existingPost.slug) {
      const slugExists = await db.blogPost.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
      }
    }

    // Update tags using set operations (remove all existing, create new)
    // A cleaner approach for many-to-many is to delete many and create many
    if (tagIds !== undefined) {
      await db.blogPostTag.deleteMany({ where: { postId: id } });
    }

    const post = await db.blogPost.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content && { content }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(published !== undefined && { published: Boolean(published) }),
        ...(categoryId && { categoryId }),
        ...(tagIds !== undefined && tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId: string) => ({
              tagId
            }))
          }
        }),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("[PUT /api/admin/blog/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await db.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/blog/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
