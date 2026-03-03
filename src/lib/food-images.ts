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
  "Drinks",
  "Rice & Curry",
  "Noodles",
  "Bread",
  "Salads",
  "Seafood",
  "Grills",
] as const;

export const FOOD_IMAGE_LIBRARY: FoodImage[] = [
  // Nepali
  { id: "n1", url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", label: "Dal Bhat", category: "Nepali" },
  { id: "n2", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop", label: "Momo", category: "Nepali" },
  { id: "n3", url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop", label: "Sel Roti", category: "Nepali" },
  { id: "n4", url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop", label: "Choila", category: "Nepali" },
  { id: "n5", url: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=400&h=300&fit=crop", label: "Thukpa", category: "Nepali" },

  // Indian
  { id: "i1", url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop", label: "Butter Chicken", category: "Indian" },
  { id: "i2", url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", label: "Biryani", category: "Indian" },
  { id: "i3", url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop", label: "Paneer Tikka", category: "Indian" },
  { id: "i4", url: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop", label: "Tandoori Chicken", category: "Indian" },
  { id: "i5", url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=300&fit=crop", label: "Naan & Curry", category: "Indian" },
  { id: "i6", url: "https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400&h=300&fit=crop", label: "Masala Dosa", category: "Indian" },

  // Chinese
  { id: "c1", url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop", label: "Fried Rice", category: "Chinese" },
  { id: "c2", url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop", label: "Chow Mein", category: "Chinese" },
  { id: "c3", url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop", label: "Spring Rolls", category: "Chinese" },
  { id: "c4", url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop", label: "Sweet & Sour", category: "Chinese" },
  { id: "c5", url: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&h=300&fit=crop", label: "Dumplings", category: "Chinese" },

  // Fast Food
  { id: "f1", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", label: "Burger", category: "Fast Food" },
  { id: "f2", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop", label: "Pizza", category: "Fast Food" },
  { id: "f3", url: "https://images.unsplash.com/photo-1630384060421-cb20aed08f06?w=400&h=300&fit=crop", label: "French Fries", category: "Fast Food" },
  { id: "f4", url: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop", label: "Sandwich", category: "Fast Food" },
  { id: "f5", url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", label: "Hot Dog", category: "Fast Food" },
  { id: "f6", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop", label: "Pasta", category: "Fast Food" },

  // Desserts
  { id: "d1", url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop", label: "Donuts", category: "Desserts" },
  { id: "d2", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop", label: "Chocolate Cake", category: "Desserts" },
  { id: "d3", url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop", label: "Ice Cream", category: "Desserts" },
  { id: "d4", url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop", label: "Gulab Jamun", category: "Desserts" },
  { id: "d5", url: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&h=300&fit=crop", label: "Cookies", category: "Desserts" },

  // Drinks
  { id: "dr1", url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop", label: "Coffee", category: "Drinks" },
  { id: "dr2", url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop", label: "Tea", category: "Drinks" },
  { id: "dr3", url: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop", label: "Smoothie", category: "Drinks" },
  { id: "dr4", url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop", label: "Lassi", category: "Drinks" },
  { id: "dr5", url: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=300&fit=crop", label: "Fresh Juice", category: "Drinks" },

  // Rice & Curry
  { id: "rc1", url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop", label: "Rice & Curry Plate", category: "Rice & Curry" },
  { id: "rc2", url: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400&h=300&fit=crop", label: "Chicken Curry", category: "Rice & Curry" },
  { id: "rc3", url: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", label: "Pulao", category: "Rice & Curry" },

  // Noodles
  { id: "no1", url: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop", label: "Ramen", category: "Noodles" },
  { id: "no2", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop", label: "Pad Thai", category: "Noodles" },
  { id: "no3", url: "https://images.unsplash.com/photo-1552611052-33e04de891de?w=400&h=300&fit=crop", label: "Udon", category: "Noodles" },

  // Bread
  { id: "b1", url: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=300&fit=crop", label: "Naan", category: "Bread" },
  { id: "b2", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop", label: "Fresh Bread", category: "Bread" },
  { id: "b3", url: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=300&fit=crop", label: "Paratha", category: "Bread" },

  // Salads
  { id: "s1", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", label: "Garden Salad", category: "Salads" },
  { id: "s2", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop", label: "Caesar Salad", category: "Salads" },
  { id: "s3", url: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=300&fit=crop", label: "Fruit Bowl", category: "Salads" },

  // Grills
  { id: "g1", url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop", label: "Grilled Chicken", category: "Grills" },
  { id: "g2", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop", label: "BBQ Ribs", category: "Grills" },
  { id: "g3", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop", label: "Kebabs", category: "Grills" },
  { id: "g4", url: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop", label: "Grilled Fish", category: "Grills" },

  // Seafood
  { id: "sf1", url: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop", label: "Shrimp", category: "Seafood" },
  { id: "sf2", url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop", label: "Fish Curry", category: "Seafood" },
  { id: "sf3", url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop", label: "Sushi", category: "Seafood" },
];
