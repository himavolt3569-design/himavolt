import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowRight, Tag, Clock } from "lucide-react";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import Footer from "@/components/layout/Footer";
import BlogSearch from "@/components/blog/BlogSearch";

export const metadata = {
  title: "Blog - HimaVolt",
  description: "News, updates, and resources from HimaVolt.",
};

export default async function BlogIndexPage(props: { searchParams?: Promise<{ category?: string, tag?: string, search?: string }> }) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams?.category;
  const tagSlug = searchParams?.tag;
  const searchQuery = searchParams?.search;

  const posts = await db.blogPost.findMany({
    where: {
      published: true,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(tagSlug && { tags: { some: { tag: { slug: tagSlug } } } }),
      ...(searchQuery && {
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { content: { contains: searchQuery, mode: "insensitive" } },
          { excerpt: { contains: searchQuery, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      tags: { include: { tag: true } },
      author: { select: { name: true, photoUrl: true } },
    },
  });

  const categories = await db.blogCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <>
    <MarketplaceHeader />
    <div className="min-h-screen bg-[#F7F9FC] pt-12 pb-20 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-1)] mb-4 tracking-tight">
            HimaVolt Blog
          </h1>
          <p className="text-lg text-[var(--text-3)] max-w-2xl mx-auto">
            Insights, product updates, and industry news.
          </p>
        </div>

        <BlogSearch initialQuery={searchQuery || ""} />

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="flex-1">
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[var(--border-soft)]">
                <p className="text-[var(--text-3)]">No posts found.</p>
                {(categorySlug || tagSlug) && (
                  <Link href="/blog" className="text-[var(--accent)] font-semibold hover:underline mt-2 inline-block">
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map((post) => (
                  <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col bg-white border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    {post.coverImageUrl ? (
                      <div className="w-full aspect-video overflow-hidden">
                        <img 
                          src={post.coverImageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-[var(--surface-alt)] to-[var(--border-soft)] flex items-center justify-center">
                        <span className="text-[var(--text-3)] font-medium">HimaVolt</span>
                      </div>
                    )}
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                          {post.category.name}
                        </span>
                        <span className="text-xs text-[var(--text-3)] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <h2 className="text-xl font-bold text-[var(--text-1)] mb-3 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      
                      {post.excerpt && (
                        <p className="text-sm text-[var(--text-2)] mb-6 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--border-soft)]">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                            {post.author?.photoUrl ? (
                              <img src={post.author.photoUrl} alt="Author" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-[var(--text-2)]">HV</span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-2)]">{post.author?.name || "HimaVolt Team"}</span>
                        </div>
                        
                        <div className="text-[var(--accent)] bg-[var(--accent)]/10 h-8 w-8 rounded-full flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-8">
            <div className="bg-white p-6 rounded-3xl border border-[var(--border-soft)] shadow-sm">
              <h3 className="font-bold text-[var(--text-1)] mb-4 flex items-center gap-2">
                Categories
              </h3>
              <div className="space-y-2">
                <Link
                  href="/blog"
                  className={`block px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!categorySlug ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)] hover:bg-[var(--surface-alt)]"}`}
                >
                  All Posts
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/blog?category=${c.slug}`}
                    className={`block px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${categorySlug === c.slug ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)] hover:bg-[var(--surface-alt)]"}`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
