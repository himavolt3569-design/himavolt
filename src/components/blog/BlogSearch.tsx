"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export default function BlogSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    // Only push to router if the query actually changed from initial to prevent loop on mount
    if (debouncedQuery === initialQuery) return;
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery) {
        params.set("search", debouncedQuery);
      } else {
        params.delete("search");
      }
      
      router.replace(`/blog?${params.toString()}`, { scroll: false });
    });
  }, [debouncedQuery, searchParams, router]);

  const handleSearch = (term: string) => {
    setQuery(term);
  };

  return (
    <div className="max-w-2xl mx-auto mb-16 relative">
      <div className="relative flex items-center">
        <Search className={`absolute left-6 h-5 w-5 transition-colors ${isPending ? 'text-[var(--accent)] animate-pulse' : 'text-[var(--text-3)]'}`} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search articles, guides, and news..." 
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-[var(--border-soft)] rounded-full text-[var(--text-1)] font-medium placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 shadow-sm transition-all"
        />
        {/* The 'auto' nature means no button is strictly necessary, but we can keep a visual indicator if we want, or just remove it to emphasize it's automatic. */}
      </div>
    </div>
  );
}
