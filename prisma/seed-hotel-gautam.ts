// Run with: npx tsx prisma/seed-hotel-gautam.ts
// Seeds Hotel Gautam restaurant with categories and mock Nepali food menu items

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find Hotel Gautam
  let restaurant = await prisma.restaurant.findFirst({
    where: { name: { contains: "Gautam", mode: "insensitive" } },
  });

  if (!restaurant) {
    // Find any owner user to attach it to
    let owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
    });
    if (!owner) {
      owner = await prisma.user.findFirst();
    }
    if (!owner) {
      console.error("No users found. Create a user first.");
      process.exit(1);
    }

    restaurant = await prisma.restaurant.create({
      data: {
        name: "Hotel Gautam",
        slug: "hotel-gautam",
        phone: "9841234567",
        countryCode: "+977",
        type: "HOTEL",
        address: "Thamel, Kathmandu",
        city: "Kathmandu",
        imageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=400&fit=crop",
        isActive: true,
        tableCount: 12,
        openingTime: "07:00",
        closingTime: "22:00",
        rating: 4.3,
        ownerId: owner.id,
      },
    });
    console.log(`✓ Created restaurant: ${restaurant.name} (${restaurant.id})`);
  } else {
    console.log(
      `✓ Found existing restaurant: ${restaurant.name} (${restaurant.id})`,
    );
  }

  const restaurantId = restaurant.id;

  // 2. Create categories
  const categoriesData = [
    { name: "Breakfast", slug: "breakfast", sortOrder: 1 },
    { name: "Dal Bhat & Rice", slug: "dal-bhat-rice", sortOrder: 2 },
    { name: "Momo & Dumplings", slug: "momo-dumplings", sortOrder: 3 },
    { name: "Noodles & Thukpa", slug: "noodles-thukpa", sortOrder: 4 },
    { name: "Tandoori & Grills", slug: "tandoori-grills", sortOrder: 5 },
    { name: "Snacks & Sides", slug: "snacks-sides", sortOrder: 6 },
    { name: "Beverages", slug: "beverages", sortOrder: 7 },
    { name: "Desserts", slug: "desserts", sortOrder: 8 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const existing = await prisma.menuCategory.findUnique({
      where: {
        restaurantId_slug: { restaurantId, slug: cat.slug },
      },
    });
    if (existing) {
      categoryMap[cat.slug] = existing.id;
      console.log(`  → Category "${cat.name}" already exists`);
    } else {
      const created = await prisma.menuCategory.create({
        data: { ...cat, restaurantId },
      });
      categoryMap[cat.slug] = created.id;
      console.log(`  ✓ Created category: ${cat.name}`);
    }
  }

  // 3. Define menu items
  const menuItems = [
    // ── Breakfast ──────────────────────────────
    {
      category: "breakfast",
      name: "Nepali Breakfast Set",
      description:
        "Traditional platter with chiura, aloo achar, fried egg, and masala tea",
      price: 250,
      imageUrl:
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
      rating: 4.6,
      prepTime: "10-15 min",
      isVeg: false,
      hasEgg: true,
      badge: "Bestseller",
      tags: ["breakfast", "traditional", "set"],
      isFeatured: true,
    },
    {
      category: "breakfast",
      name: "Puri Tarkari",
      description:
        "Crispy fried puri served with spiced potato curry and pickles",
      price: 180,
      imageUrl:
        "https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400&h=300&fit=crop",
      rating: 4.4,
      prepTime: "12-18 min",
      isVeg: true,
      tags: ["breakfast", "vegetarian", "traditional"],
    },
    {
      category: "breakfast",
      name: "Aloo Paratha",
      description:
        "Stuffed whole wheat flatbread with spiced mashed potatoes, served with yogurt and pickle",
      price: 160,
      imageUrl:
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
      rating: 4.5,
      prepTime: "15-20 min",
      isVeg: true,
      tags: ["breakfast", "paratha", "vegetarian"],
      isFeatured: true,
    },

    // ── Dal Bhat & Rice ───────────────────────
    {
      category: "dal-bhat-rice",
      name: "Dal Bhat Tarkari Set",
      description:
        "The iconic Nepali meal — steamed rice, lentil soup, seasonal vegetables, achar, and papad",
      price: 350,
      imageUrl:
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop",
      rating: 4.8,
      prepTime: "10-15 min",
      isVeg: true,
      badge: "Bestseller",
      tags: ["nepali", "dal-bhat", "traditional", "rice"],
      isFeatured: true,
      discount: 10,
      discountLabel: "10% OFF",
    },
    {
      category: "dal-bhat-rice",
      name: "Non-Veg Dal Bhat Set",
      description:
        "Complete Dal Bhat with chicken curry, dal, rice, seasonal vegetables, and achar",
      price: 450,
      imageUrl:
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
      rating: 4.7,
      prepTime: "12-18 min",
      isVeg: false,
      badge: "Most Liked",
      tags: ["nepali", "dal-bhat", "chicken", "non-veg"],
      isFeatured: true,
    },
    {
      category: "dal-bhat-rice",
      name: "Mutton Thali",
      description:
        "Premium thali with slow-cooked mutton curry, rice, dal, vegetables, and pickles",
      price: 550,
      imageUrl:
        "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop",
      rating: 4.6,
      prepTime: "15-20 min",
      isVeg: false,
      tags: ["thali", "mutton", "premium"],
    },
    {
      category: "dal-bhat-rice",
      name: "Egg Fried Rice",
      description:
        "Wok-tossed basmati rice with eggs, spring onions, and soy sauce",
      price: 280,
      imageUrl:
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "10-15 min",
      isVeg: false,
      hasEgg: true,
      tags: ["fried-rice", "egg", "quick"],
    },

    // ── Momo & Dumplings ──────────────────────
    {
      category: "momo-dumplings",
      name: "Chicken Momo (Steam)",
      description:
        "Hand-folded dumplings with spiced minced chicken, served with fiery tomato achar",
      price: 220,
      imageUrl:
        "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop",
      rating: 4.9,
      prepTime: "15-20 min",
      isVeg: false,
      badge: "Bestseller",
      tags: ["momo", "chicken", "steamed", "nepali"],
      isFeatured: true,
      discount: 15,
      discountLabel: "15% OFF",
    },
    {
      category: "momo-dumplings",
      name: "Buff Momo (Fried)",
      description:
        "Crispy fried buffalo momo with crunchy exterior and juicy filling, served with chutney",
      price: 250,
      imageUrl:
        "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop",
      rating: 4.7,
      prepTime: "18-25 min",
      isVeg: false,
      tags: ["momo", "buff", "fried"],
      isFeatured: true,
    },
    {
      category: "momo-dumplings",
      name: "Veg Momo (Steam)",
      description:
        "Steamed vegetable dumplings with cabbage, carrot, and tofu filling",
      price: 180,
      imageUrl:
        "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&h=300&fit=crop",
      rating: 4.4,
      prepTime: "15-20 min",
      isVeg: true,
      tags: ["momo", "vegetarian", "steamed"],
    },
    {
      category: "momo-dumplings",
      name: "Jhol Momo",
      description:
        "Steamed chicken momo swimming in a spicy sesame-tomato soup — Kathmandu's street favorite",
      price: 260,
      imageUrl:
        "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop",
      rating: 4.8,
      prepTime: "18-22 min",
      isVeg: false,
      badge: "Most Liked",
      tags: ["momo", "jhol", "soupy", "spicy"],
      isFeatured: true,
    },
    {
      category: "momo-dumplings",
      name: "Kothey Momo",
      description:
        "Half-fried, half-steamed momo with a crispy bottom and soft top, served with achar",
      price: 240,
      imageUrl:
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
      rating: 4.5,
      prepTime: "18-25 min",
      isVeg: false,
      tags: ["momo", "kothey", "pan-fried"],
    },

    // ── Noodles & Thukpa ──────────────────────
    {
      category: "noodles-thukpa",
      name: "Chicken Thukpa",
      description:
        "Warming Tibetan noodle soup with shredded chicken, vegetables, and fragrant spices",
      price: 280,
      imageUrl:
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
      rating: 4.6,
      prepTime: "15-22 min",
      isVeg: false,
      badge: "Bestseller",
      tags: ["thukpa", "noodle-soup", "tibetan"],
      isFeatured: true,
    },
    {
      category: "noodles-thukpa",
      name: "Chow Mein",
      description:
        "Stir-fried noodles with mixed vegetables, soy sauce, and a hint of garlic",
      price: 200,
      imageUrl:
        "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "10-15 min",
      isVeg: true,
      tags: ["noodles", "chow-mein", "stir-fried"],
    },
    {
      category: "noodles-thukpa",
      name: "Chicken Chow Mein",
      description:
        "Classic stir-fried noodles with tender chicken strips, seasonal veggies, and soy-garlic glaze",
      price: 260,
      imageUrl:
        "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop",
      rating: 4.5,
      prepTime: "12-18 min",
      isVeg: false,
      tags: ["noodles", "chicken", "chow-mein"],
    },

    // ── Tandoori & Grills ─────────────────────
    {
      category: "tandoori-grills",
      name: "Tandoori Chicken (Half)",
      description:
        "Marinated in yogurt and spices, roasted in a clay oven until charred and smoky",
      price: 450,
      imageUrl:
        "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop",
      rating: 4.7,
      prepTime: "25-35 min",
      isVeg: false,
      badge: "Bestseller",
      tags: ["tandoori", "chicken", "grilled"],
      isFeatured: true,
    },
    {
      category: "tandoori-grills",
      name: "Seekh Kebab",
      description:
        "Smoky minced lamb kebabs grilled on skewers, served with mint chutney and onion rings",
      price: 380,
      imageUrl:
        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop",
      rating: 4.5,
      prepTime: "20-30 min",
      isVeg: false,
      tags: ["kebab", "grilled", "lamb"],
    },
    {
      category: "tandoori-grills",
      name: "Paneer Tikka",
      description:
        "Cubes of paneer marinated in tandoori spices, grilled with bell peppers and onions",
      price: 320,
      imageUrl:
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop",
      rating: 4.4,
      prepTime: "18-25 min",
      isVeg: true,
      tags: ["paneer", "tikka", "vegetarian", "grilled"],
    },
    {
      category: "tandoori-grills",
      name: "Fish Fry",
      description:
        "Crispy turmeric-spiced river fish fillets, deep fried and served with lemon wedges and tartar sauce",
      price: 400,
      imageUrl:
        "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "15-22 min",
      isVeg: false,
      tags: ["fish", "fried", "seafood"],
    },

    // ── Snacks & Sides ────────────────────────
    {
      category: "snacks-sides",
      name: "Chatpate",
      description:
        "Tangy puffed rice snack mixed with onion, tomato, cilantro, lemon, and spices",
      price: 100,
      imageUrl:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop",
      rating: 4.2,
      prepTime: "5-8 min",
      isVeg: true,
      tags: ["snack", "street-food", "spicy"],
    },
    {
      category: "snacks-sides",
      name: "Samosa (2 pcs)",
      description:
        "Crispy pastry triangles stuffed with spiced potato and peas, served with tamarind chutney",
      price: 120,
      imageUrl:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "8-12 min",
      isVeg: true,
      tags: ["samosa", "snack", "vegetarian"],
    },
    {
      category: "snacks-sides",
      name: "Chicken Sekuwa",
      description:
        "Flame-grilled marinated chicken chunks — a classic Newari street-food delicacy",
      price: 300,
      imageUrl:
        "https://images.unsplash.com/photo-1532636875-6c41bc0a46ab?w=400&h=300&fit=crop",
      rating: 4.6,
      prepTime: "15-20 min",
      isVeg: false,
      badge: "Most Liked",
      tags: ["sekuwa", "grilled", "newari"],
      isFeatured: true,
    },
    {
      category: "snacks-sides",
      name: "French Fries",
      description:
        "Golden crispy potato fries seasoned with salt and served with ketchup",
      price: 150,
      imageUrl:
        "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
      rating: 4.1,
      prepTime: "8-12 min",
      isVeg: true,
      tags: ["fries", "snack", "quick"],
    },

    // ── Beverages ─────────────────────────────
    {
      category: "beverages",
      name: "Masala Tea",
      description:
        "Traditional Nepali chiya brewed with ginger, cardamom, cloves, and fresh milk",
      price: 60,
      imageUrl:
        "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop",
      rating: 4.7,
      prepTime: "5-8 min",
      isVeg: true,
      badge: "Bestseller",
      tags: ["tea", "chiya", "hot"],
      isFeatured: true,
    },
    {
      category: "beverages",
      name: "Fresh Lime Soda",
      description: "Refreshing lime soda with mint — choose sweet or salty",
      price: 80,
      imageUrl:
        "https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "3-5 min",
      isVeg: true,
      tags: ["cold", "refreshing", "lime"],
    },
    {
      category: "beverages",
      name: "Mango Lassi",
      description:
        "Thick creamy yogurt smoothie blended with ripe mangoes and a hint of cardamom",
      price: 150,
      imageUrl:
        "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&h=300&fit=crop",
      rating: 4.5,
      prepTime: "5-8 min",
      isVeg: true,
      tags: ["lassi", "mango", "cold", "yogurt"],
    },
    {
      category: "beverages",
      name: "Americano Coffee",
      description:
        "Double shot espresso diluted with hot water — bold and smooth",
      price: 120,
      imageUrl:
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop",
      rating: 4.2,
      prepTime: "3-5 min",
      isVeg: true,
      tags: ["coffee", "hot", "espresso"],
    },

    // ── Desserts ──────────────────────────────
    {
      category: "desserts",
      name: "Juju Dhau",
      description:
        "Famous Bhaktapur king-curd — creamy, sweet, set yogurt served in a clay pot",
      price: 120,
      imageUrl:
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop",
      rating: 4.8,
      prepTime: "2-3 min",
      isVeg: true,
      badge: "Most Liked",
      tags: ["dessert", "juju-dhau", "newari", "yogurt"],
      isFeatured: true,
    },
    {
      category: "desserts",
      name: "Gulab Jamun (3 pcs)",
      description:
        "Soft, spongy milk-solid balls soaked in fragrant rose-cardamom sugar syrup",
      price: 100,
      imageUrl:
        "https://images.unsplash.com/photo-1666190049017-3bd169daaedc?w=400&h=300&fit=crop",
      rating: 4.4,
      prepTime: "3-5 min",
      isVeg: true,
      tags: ["dessert", "sweet", "indian"],
    },
    {
      category: "desserts",
      name: "Kheer",
      description:
        "Slow-cooked rice pudding with milk, sugar, cardamom, raisins, and cashews",
      price: 130,
      imageUrl:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop",
      rating: 4.3,
      prepTime: "3-5 min",
      isVeg: true,
      tags: ["dessert", "kheer", "rice-pudding"],
    },
  ];

  // 4. Insert menu items
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const categoryId = categoryMap[item.category];
    if (!categoryId) {
      console.warn(`  ⚠ No category found for: ${item.category}`);
      continue;
    }

    // Check if item already exists
    const existing = await prisma.menuItem.findFirst({
      where: { restaurantId, name: item.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        rating: item.rating,
        prepTime: item.prepTime,
        isVeg: item.isVeg,
        hasEgg: item.hasEgg ?? false,
        hasOnionGarlic: true,
        isAvailable: true,
        badge: item.badge ?? null,
        tags: item.tags ?? [],
        sortOrder: i,
        discount: item.discount ?? 0,
        discountLabel: item.discountLabel ?? null,
        isFeatured: item.isFeatured ?? false,
        restaurantId,
        categoryId,
      },
    });
    created++;
  }

  // 5. Add sizes for momo items
  const momoItems = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      name: { contains: "Momo" },
    },
    select: { id: true, name: true },
  });

  for (const item of momoItems) {
    const existingSizes = await prisma.menuItemSize.findMany({
      where: { menuItemId: item.id },
    });
    if (existingSizes.length > 0) continue;

    await prisma.menuItemSize.createMany({
      data: [
        {
          label: "Half Plate",
          grams: "5 pcs",
          priceAdd: 0,
          menuItemId: item.id,
        },
        {
          label: "Full Plate",
          grams: "10 pcs",
          priceAdd: 80,
          menuItemId: item.id,
        },
      ],
    });
    console.log(`  ✓ Added sizes for ${item.name}`);
  }

  // 6. Add add-ons for thali items
  const thaliItems = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      OR: [{ name: { contains: "Dal Bhat" } }, { name: { contains: "Thali" } }],
    },
    select: { id: true, name: true },
  });

  for (const item of thaliItems) {
    const existingAddOns = await prisma.menuItemAddOn.findMany({
      where: { menuItemId: item.id },
    });
    if (existingAddOns.length > 0) continue;

    await prisma.menuItemAddOn.createMany({
      data: [
        { name: "Extra Rice", price: 50, menuItemId: item.id },
        { name: "Extra Dal", price: 40, menuItemId: item.id },
        { name: "Papad", price: 20, menuItemId: item.id },
        { name: "Curd", price: 30, menuItemId: item.id },
      ],
    });
    console.log(`  ✓ Added add-ons for ${item.name}`);
  }

  console.log(`\n━━━ Summary ━━━`);
  console.log(`✓ ${created} menu items created`);
  console.log(`→ ${skipped} items skipped (already exist)`);
  console.log(`✓ ${Object.keys(categoryMap).length} categories ready`);
  console.log("Done! 🎉");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
