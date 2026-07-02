import { headers } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import MenuPageClient from "./MenuPageClient";

// Plain same-origin fetch rather than apiFetch — apiFetch's server-side BASE
// falls back to NEXT_PUBLIC_APP_URL (the prod domain), which would make local
// dev's SSR prefetch silently hit production instead of this running server.
// Building the URL from the incoming request's own host avoids that. If this
// fails (transient pool contention), prefetchQuery swallows the error and
// simply doesn't dehydrate that query — the client-side useQuery in
// MenuPageClient then fetches it normally (via apiFetch, with its own
// retry), so there's no hard failure mode, just no SSR head start that once.
async function fetchJSON<T>(path: string): Promise<T> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  const res = await fetch(`${protocol}://${host}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Server-side prefetch of just the two queries the first paint needs
// (restaurant + menu). Everything else (rooms, combos, rush-hour, specials,
// happy-hours) stays a client-side query so this doesn't add extra load
// against the DB pool beyond what a first client round-trip already cost.
export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["restaurant", slug],
      queryFn: () => fetchJSON(`/api/public/restaurants/${slug}`),
    }),
    queryClient.prefetchQuery({
      queryKey: ["menu", slug],
      queryFn: () => fetchJSON(`/api/public/restaurants/${slug}/menu`),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuPageClient />
    </HydrationBoundary>
  );
}
