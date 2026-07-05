// ─── Per-restaurant-type category templates ──────────────────────────────
// Shared between the "seed all" endpoint and the Templates picker in the
// dashboard's Menu → Categories tab.

export type CategoryTemplate = {
  name: string;
  icon: string;
  subs: string[];
};

const DRINKS_CATEGORY: CategoryTemplate = {
  name: "Drinks",
  icon: "🥤",
  subs: ["Cold", "Hot", "Alcohol"],
};

export const CATEGORIES_BY_TYPE: Record<string, CategoryTemplate[]> = {
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
  SWEETS: [
    { name: "Traditional Sweets", icon: "🍮", subs: ["Laddu", "Barfi", "Halwa", "Peda", "Jalebi", "Gulab Jamun"] },
    { name: "Milk-Based Sweets", icon: "🥛", subs: ["Kheer", "Rasmalai", "Rasgulla", "Sandesh", "Cham Cham"] },
    { name: "Dry Sweets", icon: "🫙", subs: ["Soan Papdi", "Mathura Peda", "Kaju Katli", "Besan Laddu"] },
    { name: "Seasonal & Festival", icon: "🎉", subs: ["Dashain Special", "Tihar Special", "Teej Special", "Chhath Special"] },
    { name: "Namkeen & Savory", icon: "🥨", subs: ["Sev", "Chana Chur", "Mixture", "Pakoda"] },
    { name: "Ice Cream", icon: "🍦", subs: ["Single Scoop", "Double Scoop", "Sundae", "Kulfi"] },
    { name: "Gift Boxes", icon: "🎁", subs: ["Small Box", "Medium Box", "Large Box", "Custom Box"] },
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
export const DEFAULT_CATEGORY_TEMPLATES = CATEGORIES_BY_TYPE.RESTAURANT;

export function getCategoryTemplates(type: string): CategoryTemplate[] {
  return CATEGORIES_BY_TYPE[type] ?? DEFAULT_CATEGORY_TEMPLATES;
}

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
