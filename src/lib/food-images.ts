export interface FoodImage {
  id: string;
  url: string;
  label: string;
  category: string;
}

export const FOOD_CATEGORIES = [
  "All",
  "Nepali",
  "Indian",
  "Chinese",
  "Fast Food",
  "Desserts",
  "Rice & Curry",
  "Noodles",
  "Bread",
  "Salads",
  "Seafood",
  "Grills",
] as const;

export const DRINK_CATEGORIES = [
  "All",
  "Hot Drinks",
  "Cold Drinks",
  "Smoothies",
  "Alcohol",
  "Cocktails",
] as const;

export const FOOD_IMAGE_LIBRARY: FoodImage[] = [
  { id: "n1", url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=800&fit=crop&q=80", label: "Dal Bhat", category: "Nepali" },
  { id: "n2", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=800&fit=crop&q=80", label: "Momo", category: "Nepali" },
  { id: "n3", url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&h=800&fit=crop&q=80", label: "Sel Roti", category: "Nepali" },
  { id: "n4", url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&h=800&fit=crop&q=80", label: "Choila", category: "Nepali" },
  { id: "n5", url: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800&h=800&fit=crop&q=80", label: "Thukpa", category: "Nepali" },

  { id: "i1", url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&h=800&fit=crop&q=80", label: "Butter Chicken", category: "Indian" },
  { id: "i2", url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=800&fit=crop&q=80", label: "Biryani", category: "Indian" },
  { id: "i3", url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&h=800&fit=crop&q=80", label: "Paneer Tikka", category: "Indian" },
  { id: "i4", url: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&h=800&fit=crop&q=80", label: "Tandoori Chicken", category: "Indian" },
  { id: "i5", url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&h=800&fit=crop&q=80", label: "Naan & Curry", category: "Indian" },
  { id: "i6", url: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=800&h=800&fit=crop&q=80", label: "Masala Dosa", category: "Indian" },

  { id: "c1", url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&h=800&fit=crop&q=80", label: "Fried Rice", category: "Chinese" },
  { id: "c2", url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&h=800&fit=crop&q=80", label: "Chow Mein", category: "Chinese" },
  { id: "c3", url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&h=800&fit=crop&q=80", label: "Spring Rolls", category: "Chinese" },
  { id: "c4", url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=800&fit=crop&q=80", label: "Sweet & Sour", category: "Chinese" },
  { id: "c5", url: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&h=800&fit=crop&q=80", label: "Dumplings", category: "Chinese" },

  { id: "f1", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=800&fit=crop&q=80", label: "Burger", category: "Fast Food" },
  { id: "f2", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=800&fit=crop&q=80", label: "Pizza", category: "Fast Food" },
  { id: "f3", url: "https://images.unsplash.com/photo-1576107248881-807fecac2b6c?w=800&h=800&fit=crop&q=80", label: "French Fries", category: "Fast Food" },
  { id: "f4", url: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=800&fit=crop&q=80", label: "Sandwich", category: "Fast Food" },
  { id: "f5", url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=800&fit=crop&q=80", label: "Hot Dog", category: "Fast Food" },
  { id: "f6", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop&q=80", label: "Pasta", category: "Fast Food" },

  { id: "d1", url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&h=800&fit=crop&q=80", label: "Donuts", category: "Desserts" },
  { id: "d2", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=800&fit=crop&q=80", label: "Chocolate Cake", category: "Desserts" },
  { id: "d3", url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=800&fit=crop&q=80", label: "Ice Cream", category: "Desserts" },
  { id: "d4", url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=800&fit=crop&q=80", label: "Gulab Jamun", category: "Desserts" },
  { id: "d5", url: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&h=800&fit=crop&q=80", label: "Cookies", category: "Desserts" },

  { id: "rc1", url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&h=800&fit=crop&q=80", label: "Rice & Curry Plate", category: "Rice & Curry" },
  { id: "rc2", url: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&h=800&fit=crop&q=80", label: "Chicken Curry", category: "Rice & Curry" },
  { id: "rc3", url: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&h=800&fit=crop&q=80", label: "Pulao", category: "Rice & Curry" },

  { id: "no1", url: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&h=800&fit=crop&q=80", label: "Ramen", category: "Noodles" },
  { id: "no2", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=800&fit=crop&q=80", label: "Pad Thai", category: "Noodles" },
  { id: "no3", url: "https://images.unsplash.com/photo-1552611052-33e04de891de?w=800&h=800&fit=crop&q=80", label: "Udon", category: "Noodles" },

  { id: "b1", url: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&h=800&fit=crop&q=80", label: "Naan", category: "Bread" },
  { id: "b2", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop&q=80", label: "Fresh Bread", category: "Bread" },
  { id: "b3", url: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&h=800&fit=crop&q=80", label: "Paratha", category: "Bread" },

  { id: "s1", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=800&fit=crop&q=80", label: "Garden Salad", category: "Salads" },
  { id: "s2", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=800&fit=crop&q=80", label: "Caesar Salad", category: "Salads" },
  { id: "s3", url: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=800&h=800&fit=crop&q=80", label: "Fruit Bowl", category: "Salads" },

  { id: "g1", url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=800&fit=crop&q=80", label: "Grilled Chicken", category: "Grills" },
  { id: "g2", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=800&fit=crop&q=80", label: "BBQ Ribs", category: "Grills" },
  { id: "g3", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=800&fit=crop&q=80", label: "Kebabs", category: "Grills" },
  { id: "g4", url: "https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=800&fit=crop&q=80", label: "Grilled Fish", category: "Grills" },

  { id: "sf1", url: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&h=800&fit=crop&q=80", label: "Shrimp", category: "Seafood" },
  { id: "sf2", url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop&q=80", label: "Fish Curry", category: "Seafood" },
  { id: "sf3", url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=800&fit=crop&q=80", label: "Sushi", category: "Seafood" },
];

export const DRINK_IMAGE_LIBRARY: FoodImage[] = [
  // ── Hot Drinks ─────────────────────────────────────
  { id: "dr1", url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&h=800&fit=crop&q=80", label: "Coffee", category: "Hot Drinks" },
  { id: "dr2", url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=800&fit=crop&q=80", label: "Tea", category: "Hot Drinks" },
  { id: "dr6", url: "https://images.unsplash.com/photo-1572119915502-39bd927cb707?w=800&h=800&fit=crop&q=80", label: "Cappuccino", category: "Hot Drinks" },
  { id: "dr15", url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=800&fit=crop&q=80", label: "Latte", category: "Hot Drinks" },
  { id: "dr16", url: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&h=800&fit=crop&q=80", label: "Espresso", category: "Hot Drinks" },
  { id: "dr17", url: "https://images.unsplash.com/photo-1578899544667-01e0cf1e7d7e?w=800&h=800&fit=crop&q=80", label: "Hot Chocolate", category: "Hot Drinks" },
  { id: "dr18", url: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=800&fit=crop&q=80", label: "Masala Chai", category: "Hot Drinks" },
  { id: "dr19", url: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800&h=800&fit=crop&q=80", label: "Green Tea", category: "Hot Drinks" },
  { id: "dr20", url: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&h=800&fit=crop&q=80", label: "Americano", category: "Hot Drinks" },

  // ── Cold Drinks ─────────────────────────────────────
  { id: "dr7", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=800&fit=crop&q=80", label: "Cola", category: "Cold Drinks" },
  { id: "dr21", url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&h=800&fit=crop&q=80", label: "Coke", category: "Cold Drinks" },
  { id: "dr22", url: "https://images.unsplash.com/photo-1567103472667-6898f3a79cf2?w=800&h=800&fit=crop&q=80", label: "Pepsi", category: "Cold Drinks" },
  { id: "dr23", url: "https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=800&h=800&fit=crop&q=80", label: "Fanta", category: "Cold Drinks" },
  { id: "dr24", url: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&h=800&fit=crop&q=80", label: "Sprite", category: "Cold Drinks" },
  { id: "dr8", url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&h=800&fit=crop&q=80", label: "Orange Juice", category: "Cold Drinks" },
  { id: "dr5", url: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=800&h=800&fit=crop&q=80", label: "Fresh Juice", category: "Cold Drinks" },
  { id: "dr9", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=800&fit=crop&q=80", label: "Iced Coffee", category: "Cold Drinks" },
  { id: "dr25", url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=800&fit=crop&q=80", label: "Lemonade", category: "Cold Drinks" },
  { id: "dr26", url: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&h=800&fit=crop&q=80", label: "Iced Tea", category: "Cold Drinks" },
  { id: "dr27", url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop&q=80", label: "Cold Brew", category: "Cold Drinks" },
  { id: "dr28", url: "https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=800&h=800&fit=crop&q=80", label: "Soda", category: "Cold Drinks" },
  { id: "dr29", url: "https://images.unsplash.com/photo-1598614187854-26a60e982dc4?w=800&h=800&fit=crop&q=80", label: "Mineral Water", category: "Cold Drinks" },

  // ── Smoothies ───────────────────────────────────────
  { id: "dr3", url: "https://images.unsplash.com/photo-1546173159-315724a31696?w=800&h=800&fit=crop&q=80", label: "Smoothie", category: "Smoothies" },
  { id: "dr4", url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=800&fit=crop&q=80", label: "Lassi", category: "Smoothies" },
  { id: "dr10", url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&h=800&fit=crop&q=80", label: "Berry Smoothie", category: "Smoothies" },
  { id: "dr30", url: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&h=800&fit=crop&q=80", label: "Mango Shake", category: "Smoothies" },
  { id: "dr31", url: "https://images.unsplash.com/photo-1577805947697-89e18249d767?w=800&h=800&fit=crop&q=80", label: "Milkshake", category: "Smoothies" },

  // ── Cocktails ───────────────────────────────────────
  { id: "dr11", url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=800&fit=crop&q=80", label: "Cocktail", category: "Cocktails" },
  { id: "dr12", url: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop&q=80", label: "Margarita", category: "Cocktails" },
  { id: "dr32", url: "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800&h=800&fit=crop&q=80", label: "Mojito", category: "Cocktails" },
  { id: "dr33", url: "https://images.unsplash.com/photo-1587223962217-f4e4612c87da?w=800&h=800&fit=crop&q=80", label: "Piña Colada", category: "Cocktails" },

  // ── Alcohol ─────────────────────────────────────────
  { id: "dr13", url: "https://images.unsplash.com/photo-1606850080621-3df753dbbb3c?w=800&h=800&fit=crop&q=80", label: "Beer", category: "Alcohol" },
  { id: "dr14", url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=800&fit=crop&q=80", label: "Wine", category: "Alcohol" },
  { id: "dr34", url: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&h=800&fit=crop&q=80", label: "Whiskey", category: "Alcohol" },
  { id: "dr35", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=800&fit=crop&q=80", label: "Vodka", category: "Alcohol" },
  { id: "dr36", url: "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=800&h=800&fit=crop&q=80", label: "Rum", category: "Alcohol" },
];
