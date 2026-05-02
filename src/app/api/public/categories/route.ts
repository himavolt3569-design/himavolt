import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get unique category names from MenuCategory table
    const categories = await db.menuCategory.findMany({
      where: {
        isActive: true,
        restaurant: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        icon: true,
      },
      distinct: ["name"],
      orderBy: { sortOrder: "asc" },
    });

    // We can't easily get a representative image for a global category from DB without more schema
    // So we'll map them to our existing high-quality images if they match, or use a default.
    const imageMap: Record<string, string> = {
      Momo: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&h=200&fit=crop",
      Thali: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop",
      Pizza: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop",
      Burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop",
      Biryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop",
      Coffee: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop",
      Nepali: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop",
      Chinese: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop",
      Bakery: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop",
    };

    const formattedCategories = [
      {
        id: "all",
        name: "All",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
      },
      ...categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: imageMap[cat.name] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop",
      })),
    ];

    return NextResponse.json(formattedCategories);
  } catch (err) {
    console.error("[API GET /api/public/categories]", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
