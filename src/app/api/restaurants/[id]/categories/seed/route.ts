import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// ─── Per-type category templates ─────────────────────────────────────────────

type CategoryTemplate = {
  name: string;
  icon: string;
  subs: string[];
};

const DRINKS_CATEGORY: CategoryTemplate = {
  name: "Drinks",
  icon: "🥤",
  subs: ["Cold", "Hot", "Alcohol"],
};

const CATEGORIES_BY_TYPE: Record<string, CategoryTemplate[]> = {
  RESTAURANT: [
    { name: "Appetizers", icon: "🍢", subs: ["Fried", "Grilled", "Cold"] },
    { name: "Soup & Salads", icon: "🥗", subs: ["Soups", "Salads"] },
    { name: "Momo", icon: "🥟", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "Tandoori"] },
    { name: "Curry", icon: "🍛", subs: ["Chicken", "Mutton", "Paneer", "Vegetable", "Fish", "Dal"] },
    { name: "Rice & Noodles", icon: "🍜", subs: ["Fried Rice", "Biryani", "Chow Mein", "Thukpa", "Pulao"] },
    { name: "Thali Sets", icon: "🍽️", subs: ["Veg Thali", "Non-Veg Thali", "Special Thali"] },
    { name: "Tandoori", icon: "🔥", subs: ["Chicken", "Paneer", "Fish", "Kebab"] },
    { name: "Breads", icon: "🫓", subs: ["Naan", "Roti", "Paratha", "Kulcha"] },
    { name: "Desserts", icon: "🍮", subs: ["Indian", "Western", "Ice Cream"] },
    DRINKS_CATEGORY,
  ],
  FAST_FOOD: [
    { name: "Burgers", icon: "🍔", subs: ["Chicken", "Veg", "Special"] },
    { name: "Pizza", icon: "🍕", subs: ["Classic", "Special", "Veg"] },
    { name: "Sandwiches", icon: "🥪", subs: ["Chicken", "Veg", "Club"] },
    { name: "Fried Items", icon: "🍟", subs: ["Fries", "Nuggets", "Rings"] },
    { name: "Momos", icon: "🥟", subs: ["Steam", "Fried", "Jhol", "Chilli"] },
    { name: "Wraps", icon: "🌯", subs: ["Chicken", "Veg", "Egg"] },
    { name: "Combo Meals", icon: "🎁", subs: ["Small", "Regular", "Large"] },
    { name: "Snacks", icon: "🍿", subs: ["Chatpate", "Samosa", "Pakoda"] },
    { name: "Ice Cream", icon: "🍦", subs: ["Single Scoop", "Double Scoop", "Sundae"] },
    DRINKS_CATEGORY,
  ],
  CAFE: [
    { name: "Coffee", icon: "☕", subs: ["Espresso", "Americano", "Latte", "Cappuccino", "Mocha", "Cold Brew"] },
    { name: "Tea", icon: "🍵", subs: ["Masala Chai", "Green Tea", "Herbal", "Lemon Tea"] },
    { name: "Specialty Drinks", icon: "🧋", subs: ["Matcha", "Bubble Tea", "Smoothies", "Frappuccino"] },
    { name: "Pastries", icon: "🥐", subs: ["Croissant", "Muffin", "Danish", "Scone"] },
    { name: "Cakes & Desserts", icon: "🎂", subs: ["Slice Cakes", "Brownies", "Cookies", "Cheesecake"] },
    { name: "Light Bites", icon: "🥪", subs: ["Sandwiches", "Wraps", "Toast"] },
    { name: "Breakfast", icon: "🍳", subs: ["Full Breakfast", "Eggs", "Pancakes", "Granola"] },
    DRINKS_CATEGORY,
  ],
  BAKERY: [
    { name: "Breads", icon: "🍞", subs: ["Sourdough", "Multigrain", "Baguette", "Focaccia"] },
    { name: "Cakes", icon: "🎂", subs: ["Birthday", "Anniversary", "Custom", "Layer Cakes"] },
    { name: "Pastries", icon: "🥐", subs: ["Croissant", "Danish", "Éclair", "Tart"] },
    { name: "Cookies & Biscuits", icon: "🍪", subs: ["Chocolate Chip", "Butter", "Oatmeal"] },
    { name: "Muffins & Cupcakes", icon: "🧁", subs: ["Chocolate", "Blueberry", "Vanilla", "Red Velvet"] },
    { name: "Daily Specials", icon: "✨", subs: ["Morning Special", "Seasonal", "Limited Edition"] },
    { name: "Savory Bakes", icon: "🫓", subs: ["Patties", "Rolls", "Quiche", "Calzone"] },
    DRINKS_CATEGORY,
  ],
  BAR: [
    { name: "Beers", icon: "🍺", subs: ["Draught", "Bottled", "Craft", "Imported"] },
    { name: "Whisky", icon: "🥃", subs: ["Scotch", "Bourbon", "Blended", "Single Malt"] },
    { name: "Cocktails", icon: "🍹", subs: ["Classic", "Signature", "Mocktail"] },
    { name: "Wine", icon: "🍷", subs: ["Red", "White", "Rosé", "Sparkling"] },
    { name: "Spirits", icon: "🍾", subs: ["Vodka", "Rum", "Gin", "Tequila"] },
    { name: "Shots", icon: "🥂", subs: ["Classic", "Flavored", "Layered"] },
    { name: "Snacks & Bites", icon: "🍟", subs: ["Fried", "Grilled", "Dips & Nachos"] },
    DRINKS_CATEGORY,
  ],
  HOTEL: [
    { name: "Breakfast", icon: "🍳", subs: ["Continental", "Full English", "Asian", "Veg"] },
    { name: "All Day Dining", icon: "🍽️", subs: ["Appetizers", "Mains", "Grills", "Pasta"] },
    { name: "Room Service", icon: "🛎️", subs: ["Light Meals", "Snacks", "Late Night"] },
    { name: "Buffet", icon: "🥘", subs: ["Salad Bar", "Hot Counter", "Dessert Station"] },
    { name: "Indian Cuisine", icon: "🍛", subs: ["Curry", "Tandoori", "Breads", "Rice"] },
    { name: "Chinese Cuisine", icon: "🥢", subs: ["Soups", "Dim Sum", "Noodles", "Rice"] },
    { name: "Desserts", icon: "🍮", subs: ["Indian", "Western", "Ice Cream"] },
    DRINKS_CATEGORY,
  ],
  RESORT: [
    { name: "Pool Bar Menu", icon: "🏊", subs: ["Snacks", "Sandwiches", "Light Bites"] },
    { name: "Breakfast", icon: "🍳", subs: ["Continental", "Full English", "Asian", "Veg"] },
    { name: "Multi-Cuisine", icon: "🍽️", subs: ["Indian", "Chinese", "Continental", "Nepali"] },
    { name: "Grills & BBQ", icon: "🔥", subs: ["Chicken", "Seafood", "Veg", "Mixed Grill"] },
    { name: "Desserts", icon: "🍮", subs: ["Indian Sweets", "Western", "Ice Cream"] },
    { name: "Room Service", icon: "🛎️", subs: ["Light Meals", "Snacks", "Late Night"] },
    DRINKS_CATEGORY,
  ],
  CLOUD_KITCHEN: [
    { name: "Mains", icon: "🍛", subs: ["Chicken", "Mutton", "Vegetarian", "Seafood"] },
    { name: "Rice & Biryani", icon: "🍚", subs: ["Dum Biryani", "Fried Rice", "Pulao"] },
    { name: "Noodles & Pasta", icon: "🍜", subs: ["Chow Mein", "Hakka", "Pasta", "Thukpa"] },
    { name: "Fast Food", icon: "🍔", subs: ["Burgers", "Wraps", "Sandwiches"] },
    { name: "Combos", icon: "🎁", subs: ["Lunch Combo", "Dinner Combo", "Family Pack"] },
    { name: "Desserts", icon: "🍮", subs: ["Gulab Jamun", "Ice Cream", "Kheer"] },
    DRINKS_CATEGORY,
  ],
  MO_MO_SHOP: [
    { name: "Buff Momo", icon: "🐃", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "C.Momo", "Tandoori", "Pan Fried"] },
    { name: "Chicken Momo", icon: "🐔", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "C.Momo", "Tandoori"] },
    { name: "Veg Momo", icon: "🥬", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "Tandoori"] },
    { name: "Pork Momo", icon: "🥩", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey"] },
    { name: "Special Momo", icon: "⭐", subs: ["Cheese Momo", "Chocolate Momo", "Mix Momo", "XL Momo"] },
    { name: "Sides", icon: "🍜", subs: ["Chow Mein", "Thukpa", "Achar", "Extras"] },
    DRINKS_CATEGORY,
  ],
  TANDOORI: [
    { name: "Tandoori Chicken", icon: "🍗", subs: ["Half", "Full", "Boneless", "Tikka"] },
    { name: "Kebabs", icon: "🔥", subs: ["Seekh Kebab", "Boti Kebab", "Reshmi Kebab", "Shami"] },
    { name: "Paneer Tandoori", icon: "🧀", subs: ["Paneer Tikka", "Paneer Shashlik", "Malai Tikka"] },
    { name: "Naan & Breads", icon: "🫓", subs: ["Plain Naan", "Butter Naan", "Garlic Naan", "Tandoori Roti", "Kulcha"] },
    { name: "Sides & Rice", icon: "🍚", subs: ["Jeera Rice", "Dal Makhani", "Raita", "Salad"] },
    { name: "Specials", icon: "⭐", subs: ["Platter", "Mixed Grill", "Family Pack"] },
    DRINKS_CATEGORY,
  ],
  GUEST_HOUSE: [
    { name: "Breakfast", icon: "🍳", subs: ["Nepali Breakfast", "Continental", "Eggs", "Toast & Spreads"] },
    { name: "Dal Bhat", icon: "🍽️", subs: ["Veg Dal Bhat", "Non-Veg Dal Bhat", "Special Thali"] },
    { name: "Momo", icon: "🥟", subs: ["Steam", "Fried", "Jhol", "Chilli"] },
    { name: "Snacks", icon: "🥪", subs: ["Sandwiches", "Momos", "Chowmein", "Spring Rolls"] },
    { name: "Room Service", icon: "🛎️", subs: ["Light Meals", "Late Night Snacks"] },
    { name: "Desserts", icon: "🍮", subs: ["Local Sweets", "Ice Cream", "Fruit"] },
    DRINKS_CATEGORY,
  ],
};

// Fallback for unknown types (use RESTAURANT template)
const DEFAULT_CATEGORIES = CATEGORIES_BY_TYPE.RESTAURANT;

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, type: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const templates = CATEGORIES_BY_TYPE[restaurant.type] ?? DEFAULT_CATEGORIES;

  try {
    // Delete existing categories first (clean slate)
    await db.menuCategory.deleteMany({ where: { restaurantId: id } });

    let sortOrder = 1;
    const created: { name: string; subs: string[] }[] = [];

    for (const cat of templates) {
      const parentSlug = toSlug(cat.name);
      const parent = await db.menuCategory.create({
        data: {
          name: cat.name,
          slug: parentSlug,
          icon: cat.icon,
          sortOrder: sortOrder++,
          restaurantId: id,
        },
      });

      let subSort = 1;
      for (const subName of cat.subs) {
        await db.menuCategory.create({
          data: {
            name: subName,
            slug: `${parentSlug}--${toSlug(subName)}`,
            sortOrder: subSort++,
            restaurantId: id,
            parentId: parent.id,
          },
        });
      }

      created.push({ name: cat.name, subs: cat.subs });
    }

    return NextResponse.json({
      message: `Created ${created.length} categories for ${restaurant.type}`,
      categories: created,
    });
  } catch (err) {
    console.error("[Categories Seed]", err);
    return NextResponse.json(
      { error: "Failed to seed", detail: String(err) },
      { status: 500 },
    );
  }
}
