"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function SaveHeart({
  type,
  id,
  className,
  iconClassName,
}: {
  type: "restaurant" | "food";
  id: string;
  className?: string;
  iconClassName?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const { data: favourites = [] } = useQuery({
    queryKey: ["favourites"],
    queryFn: () => apiFetch<{ restaurantId?: string; menuItemId?: string }[]>("/api/me/favourites"),
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 1000,
  });

  const isSaved = favourites.some((f: { restaurantId?: string; menuItemId?: string }) => 
    type === "restaurant" ? f.restaurantId === id : f.menuItemId === id
  );

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    try {
      if (isSaved) {
        const params = type === "restaurant" ? `restaurantId=${id}` : `menuItemId=${id}`;
        await fetch(`/api/me/favourites?${params}`, { method: "DELETE" });
        showToast(type === "restaurant" ? "Removed from saved restaurants" : "Removed from saved foods");
      } else {
        const body = type === "restaurant" ? { restaurantId: id } : { menuItemId: id };
        const res = await fetch("/api/me/favourites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to save");
        showToast(type === "restaurant" ? "Saved restaurant" : "Saved food", "success");
      }
      queryClient.invalidateQueries({ queryKey: ["favourites"] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update saved item", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleSave}
      disabled={loading || !isLoaded}
      className={`flex items-center justify-center transition-colors active:scale-90 ${className || ""}`}
    >
      {loading ? (
        <Loader2 className={`animate-spin ${iconClassName || "h-5 w-5"}`} />
      ) : (
        <Heart
          className={`transition-all duration-300 ${iconClassName || "h-5 w-5"} ${
            isSaved ? "fill-red-400 text-red-400 scale-110" : "text-white"
          }`}
        />
      )}
    </button>
  );
}
