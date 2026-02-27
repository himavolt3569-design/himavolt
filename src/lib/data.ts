export const categories = [
  { id: 1, name: "Momo", image: "🥟" },
  { id: 2, name: "Thali", image: "🍛" },
  { id: 3, name: "Pizza", image: "🍕" },
  { id: 4, name: "Burger", image: "🍔" },
  { id: 5, name: "Biryani", image: "🍲" },
  { id: 6, name: "Coffee", image: "☕" },
  { id: 7, name: "Nepali", image: "🏔️" },
  { id: 8, name: "Continental", image: "🍝" },
  { id: 9, name: "Desserts", image: "🧁" },
  { id: 10, name: "Healthy", image: "🥗" },
  { id: 11, name: "Drinks", image: "🥤" },
  { id: 12, name: "Bakery", image: "🥐" },
  { id: 13, name: "Chinese", image: "🍜" },
  { id: 14, name: "Sushi", image: "🍣" },
  { id: 15, name: "Ice Cream", image: "🍦" },
  { id: 16, name: "Tandoori", image: "🍗" },
  { id: 17, name: "Noodles", image: "🍜" },
  { id: 18, name: "Rolls", image: "🌯" },
  { id: 19, name: "Cakes", image: "🎂" },
  { id: 20, name: "Juice", image: "🧃" },
];

export const offers = [
  {
    id: 1,
    title: "60% OFF up to Rs. 120",
    subtitle: "USE STEALDEAL | ABOVE Rs. 159",
    bgColor: "bg-gradient-to-r from-orange-500 to-red-500",
  },
  {
    id: 2,
    title: "FREE DELIVERY",
    subtitle: "ON ORDERS ABOVE Rs. 499",
    bgColor: "bg-gradient-to-r from-blue-500 to-cyan-500",
  },
  {
    id: 3,
    title: "FLAT Rs. 100 OFF",
    subtitle: "USE HIMAL100 | FIRST ORDER",
    bgColor: "bg-gradient-to-r from-[#0A4D3C] to-[#1E9A6F]",
  },
  {
    id: 4,
    title: "20% OFF ON DRINKS",
    subtitle: "HAPPY HOURS | 4PM - 7PM",
    bgColor: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
];

export interface AddOn {
  id: number;
  name: string;
  price: number;
}

export interface FoodItem {
  id: number;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  restaurant: string;
  rating: string;
  time: string;
  image: string;
  discount: string;
  addOns: AddOn[];
}

export const bestFoods: FoodItem[] = [
  {
    id: 1,
    name: "Chicken Momo",
    description:
      "Juicy steamed dumplings stuffed with hand-minced chicken, fresh herbs, and traditional Nepali spices. Served with fiery tomato achar.",
    price: 250,
    priceLabel: "Rs. 250",
    restaurant: "Thamel Momo House",
    rating: "4.8",
    time: "25 mins",
    image:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800&auto=format&fit=crop",
    discount: "20% OFF",
    addOns: [
      { id: 101, name: "Extra Spicy Sauce", price: 30 },
      { id: 102, name: "Extra Momo (4 pcs)", price: 80 },
      { id: 103, name: "Jhol Achar", price: 40 },
    ],
  },
  {
    id: 2,
    name: "Margherita Pizza",
    description:
      "Wood-fired thin crust topped with San Marzano tomato sauce, fresh mozzarella di bufala, and fragrant basil leaves.",
    price: 650,
    priceLabel: "Rs. 650",
    restaurant: "Fire & Ice Pizzeria",
    rating: "4.7",
    time: "30 mins",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop",
    discount: "",
    addOns: [
      { id: 201, name: "Extra Cheese", price: 80 },
      { id: 202, name: "Garlic Dip", price: 50 },
      { id: 203, name: "Jalapeños", price: 40 },
    ],
  },
  {
    id: 3,
    name: "Classic Smash Burger",
    description:
      "Double-smashed beef patties with melted cheddar, caramelized onions, house sauce, pickles, and a brioche bun.",
    price: 450,
    priceLabel: "Rs. 450",
    restaurant: "BurgerShack KTM",
    rating: "4.6",
    time: "20 mins",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    discount: "FREE DELIVERY",
    addOns: [
      { id: 301, name: "Extra Patty", price: 120 },
      { id: 302, name: "Bacon", price: 80 },
      { id: 303, name: "No Onion", price: 0 },
    ],
  },
  {
    id: 4,
    name: "Daal Bhat Thali",
    description:
      "Complete Nepali meal with steamed rice, yellow lentil soup, seasonal vegetable tarkari, achar, papad, and a side of gundruk.",
    price: 350,
    priceLabel: "Rs. 350",
    restaurant: "Thakali Kitchen",
    rating: "4.5",
    time: "35 mins",
    image:
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=800&auto=format&fit=crop",
    discount: "Rs.50 OFF",
    addOns: [
      { id: 401, name: "Extra Rice", price: 30 },
      { id: 402, name: "Chicken Curry", price: 100 },
      { id: 403, name: "Ghee", price: 20 },
    ],
  },
  {
    id: 5,
    name: "Cappuccino & Croissant",
    description:
      "Himalayan Java's signature double-shot cappuccino paired with a warm, flaky butter croissant baked fresh every morning.",
    price: 380,
    priceLabel: "Rs. 380",
    restaurant: "Himalayan Java",
    rating: "4.6",
    time: "15 mins",
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop",
    discount: "",
    addOns: [
      { id: 501, name: "Extra Shot", price: 60 },
      { id: 502, name: "Oat Milk", price: 40 },
      { id: 503, name: "Chocolate Drizzle", price: 30 },
    ],
  },
  {
    id: 6,
    name: "Chicken Biryani",
    description:
      "Aromatic basmati rice layered with slow-cooked spiced chicken, saffron, fried onions, and mint. Served with raita.",
    price: 420,
    priceLabel: "Rs. 420",
    restaurant: "Angan Restaurant",
    rating: "4.4",
    time: "40 mins",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop",
    discount: "FLAT 25% OFF",
    addOns: [
      { id: 601, name: "Extra Raita", price: 40 },
      { id: 602, name: "Egg", price: 30 },
      { id: 603, name: "Spicy Sauce", price: 20 },
    ],
  },
  {
    id: 7,
    name: "Chocolate Lava Cake",
    description:
      "Warm, gooey chocolate fondant with a molten center, dusted with cocoa powder and served with vanilla bean ice cream.",
    price: 320,
    priceLabel: "Rs. 320",
    restaurant: "The Yellow House",
    rating: "4.9",
    time: "25 mins",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop",
    discount: "",
    addOns: [
      { id: 701, name: "Extra Ice Cream Scoop", price: 60 },
      { id: 702, name: "Whipped Cream", price: 30 },
      { id: 703, name: "Berry Compote", price: 50 },
    ],
  },
  {
    id: 8,
    name: "Fresh Garden Salad",
    description:
      "Crisp mixed greens with cherry tomatoes, cucumber, avocado, toasted seeds, and a light lemon-tahini dressing.",
    price: 280,
    priceLabel: "Rs. 280",
    restaurant: "OR2K Kathmandu",
    rating: "4.3",
    time: "20 mins",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
    discount: "15% OFF",
    addOns: [
      { id: 801, name: "Grilled Chicken", price: 100 },
      { id: 802, name: "Feta Cheese", price: 60 },
      { id: 803, name: "Extra Dressing", price: 20 },
    ],
  },
];
