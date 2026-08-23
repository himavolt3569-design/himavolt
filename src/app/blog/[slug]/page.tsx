import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import type { Metadata } from "next";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import Footer from "@/components/layout/Footer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  
  if (!post || !post.published) {
    return { title: "Not Found" };
  }

  return {
    title: `${post.title} - HimaVolt Blog`,
    description: post.excerpt || `Read ${post.title} on the HimaVolt Blog`,
    openGraph: {
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    }
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const post = await db.blogPost.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: { include: { tag: true } },
      author: { select: { name: true, photoUrl: true } },
    }
  });

  if (!post || !post.published) {
    notFound();
  }

  return (
    <>
    <MarketplaceHeader />
    <div className="min-h-screen bg-white">
      {/* Article Header */}
      <header className="pt-12 pb-12 px-4 border-b border-[var(--border-soft)] bg-[#F7F9FC]">
        <div className="max-w-[800px] mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--accent)] transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/blog?category=${post.category.slug}`} className="px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white transition-colors">
              {post.category.name}
            </Link>
            <span className="text-sm text-[var(--text-3)] flex items-center gap-1 font-medium">
              <Clock className="h-4 w-4" />
              {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-1)] tracking-tight leading-tight mb-6">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-xl text-[var(--text-2)] leading-relaxed mb-8">
              {post.excerpt}
            </p>
          )}
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
              {post.author?.photoUrl ? (
                <img src={post.author.photoUrl} alt="Author" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-[var(--text-2)]">HV</span>
              )}
            </div>
            <div>
              <p className="font-bold text-[var(--text-1)]">{post.author?.name || "HimaVolt Team"}</p>
              <p className="text-sm text-[var(--text-3)]">Author</p>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImageUrl && (
        <div className="max-w-[1000px] mx-auto px-4 -mt-8 relative z-10">
          <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-soft)] bg-gray-100">
            <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Content */}
      <article className={`max-w-[800px] mx-auto px-4 ${post.coverImageUrl ? 'pt-16' : 'pt-12'} pb-24`}>
        <div 
          className="prose prose-lg md:prose-xl max-w-none prose-headings:text-[var(--text-1)] prose-headings:font-bold prose-p:text-[var(--text-2)] prose-p:leading-relaxed prose-a:text-[var(--accent)] hover:prose-a:text-[var(--accent-hover)] prose-img:rounded-2xl prose-img:border prose-img:border-[var(--border-soft)] prose-img:shadow-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[var(--border-soft)]">
            <h3 className="text-sm font-bold text-[var(--text-1)] mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--text-3)]" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(({ tag }) => (
                <Link 
                  key={tag.id} 
                  href={`/blog?tag=${tag.slug}`}
                  className="px-3 py-1.5 bg-[#F7F9FC] border border-[var(--border-soft)] rounded-lg text-sm font-semibold text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
    <Footer />
    </>
  );
}
