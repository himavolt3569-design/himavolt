"use client";

import { useState, useEffect } from "react";
import { StoryViewer, type Story } from "@/components/ui/story-viewer";

interface RestaurantStoryGroup {
  restaurant: {
    id: string;
    name: string;
    avatar: string | null;
  };
  stories: {
    id: string;
    type: "image" | "video";
    src: string;
    caption: string | null;
    viewCount: number;
    createdAt: string;
    postedBy: string;
    postedByRole: string;
  }[];
}

const PLACEHOLDER_AVATAR =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop";

export default function MenuStories({ slug }: { slug: string }) {
  const [data, setData] = useState<RestaurantStoryGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStories() {
      try {
        const res = await fetch(`/api/public/restaurants/${slug}/stories`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStories();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !data || data.stories.length === 0) return null;

  // Group stories by poster (each staff member's stories are separate)
  const grouped = new Map<
    string,
    {
      name: string;
      avatar: string;
      stories: Story[];
      timestamp: string;
    }
  >();

  // Group all under the restaurant name for simplicity
  const restaurantStories: Story[] = data.stories.map((s) => ({
    id: s.id,
    type: s.type as "image" | "video",
    src: s.src,
  }));

  if (restaurantStories.length === 0) return null;

  // Also group by poster for individual staff stories
  for (const s of data.stories) {
    const key = s.postedBy;
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: key,
        avatar: data.restaurant.avatar || PLACEHOLDER_AVATAR,
        stories: [],
        timestamp: s.createdAt,
      });
    }
    grouped.get(key)!.stories.push({
      id: s.id,
      type: s.type as "image" | "video",
      src: s.src,
    });
  }

  const groups = Array.from(grouped.values());

  // If only 1 poster, show as single restaurant story
  // If multiple posters, show each as separate story circle
  const showIndividual = groups.length > 1;

  return (
    <div className="w-full">
      <div className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-hide">
        {showIndividual ? (
          groups.map((group) => (
            <StoryViewer
              key={group.name}
              stories={group.stories}
              username={group.name}
              avatar={group.avatar}
              timestamp={group.timestamp}
              onStoryView={(storyId) => {
                // Increment view count
                fetch(
                  `/api/public/restaurants/${slug}/stories/view?id=${storyId}`,
                  { method: "POST" },
                ).catch(() => {});
              }}
            />
          ))
        ) : (
          <StoryViewer
            stories={restaurantStories}
            username={data.restaurant.name}
            avatar={data.restaurant.avatar || PLACEHOLDER_AVATAR}
            timestamp={data.stories[0]?.createdAt}
            onStoryView={(storyId) => {
              fetch(
                `/api/public/restaurants/${slug}/stories/view?id=${storyId}`,
                { method: "POST" },
              ).catch(() => {});
            }}
          />
        )}
      </div>
    </div>
  );
}
