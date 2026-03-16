import { formatPrice } from "./currency";

export const categories = [
  {
    id: 1,
    name: "All",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
  },
  {
    id: 2,
    name: "Momo",
    image:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&h=200&fit=crop",
  },
  {
    id: 3,
    name: "Thali",
    image:
      "https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop",
  },
  {
    id: 4,
    name: "Pizza",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop",
  },
  {
    id: 5,
    name: "Burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop",
  },
  {
    id: 6,
    name: "Biryani",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop",
  },
  {
    id: 7,
    name: "Coffee",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop",
  },
  {
    id: 8,
    name: "Nepali",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop",
  },
  {
    id: 9,
    name: "Chinese",
    image:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop",
  },
  {
    id: 10,
    name: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200&h=200&fit=crop",
  },
  {
    id: 11,
    name: "Healthy",
    image:
      "https://images.unsplash.com/photo-1564093497595-593b96d80180?w=200&h=200&fit=crop",
  },
  {
    id: 12,
    name: "Drinks",
    image:
      "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop",
  },
  {
    id: 13,
    name: "Bakery",
    image:
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop",
  },
  {
    id: 14,
    name: "Sushi",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&h=200&fit=crop",
  },
  {
    id: 15,
    name: "Ice Cream",
    image:
      "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop",
  },
  {
    id: 16,
    name: "Tandoori",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop",
  },
  {
    id: 17,
    name: "Noodles",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop",
  },
  {
    id: 18,
    name: "Rolls",
    image:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop",
  },
  {
    id: 19,
    name: "Cakes",
    image:
      "https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=200&h=200&fit=crop",
  },
  {
    id: 20,
    name: "Juice",
    image:
      "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&h=200&fit=crop",
  },
];

export const offers = [
  {
    id: 1,
    title: `60% OFF up to ${formatPrice(120, "NPR")}`,
    subtitle: `USE STEALDEAL | ABOVE ${formatPrice(159, "NPR")}`,
    bgColor: "from-[#E23744] via-[#C62828] to-[#B71C1C]",
    image:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&h=400&fit=crop",
    badge: "Most Popular",
    cta: "Grab Now",
  },
  {
    id: 2,
    title: "FREE DELIVERY",
    subtitle: `ON ORDERS ABOVE ${formatPrice(499, "NPR")}`,
    bgColor: "from-[#0A4D3C] via-[#1B5E46] to-[#2E7D5E]",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop",
    badge: "Limited Time",
    cta: "Order Now",
  },
  {
    id: 3,
    title: `FLAT ${formatPrice(100, "NPR")} OFF`,
    subtitle: "USE HIMAL100 | FIRST ORDER",
    bgColor: "from-[#E65100] via-[#F57C00] to-[#FF9933]",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop",
    badge: "New Users",
    cta: "Claim Offer",
  },
  {
    id: 4,
    title: "20% OFF ON DRINKS",
    subtitle: "HAPPY HOURS | 4PM - 7PM",
    bgColor: "from-[#4A148C] via-[#6A1B9A] to-[#AB47BC]",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=400&fit=crop",
    badge: "Daily Deal",
    cta: "Explore Drinks",
  },
];
