"use client";

import { useState, useRef, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Clock, ChevronDown, SlidersHorizontal, Flame, Sparkles, Tag, Plus } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Data: 108 food items across 4 categories ─────────────────────── */

interface FoodItem {
  id: number;
  name: string;
  image: string;
  price: number;
  rating: number;
  reviews: number;
  prepTime: string;
  tags: string[];
  offer?: string;
  isVeg?: boolean;
  category: string;
}

let _id = 0;
const f = (
  name: string,
  image: string,
  price: number,
  rating: number,
  reviews: number,
  prepTime: string,
  tags: string[],
  category: string,
  offer?: string,
  isVeg?: boolean
): FoodItem => ({ id: ++_id, name, image, price, rating, reviews, prepTime, tags, category, offer, isVeg });

const ALL_FOODS: FoodItem[] = [
  // ─── Nepali Favorites ────────────────────────────
  f("Buff Momo", "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop", 220, 4.5, 312, "15-20 min", ["Nepali", "Momo"], "Momo"),
  f("Chicken Momo", "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&h=300&fit=crop", 200, 4.3, 287, "15-20 min", ["Nepali", "Momo"], "Momo", "FLAT Rs.50 OFF"),
  f("Veg Momo", "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop", 160, 4.2, 198, "15-20 min", ["Nepali", "Vegetarian"], "Momo", undefined, true),
  f("Jhol Momo", "https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=300&fit=crop", 240, 4.6, 425, "20-25 min", ["Nepali", "Spicy"], "Momo"),
  f("Fried Momo", "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&h=300&fit=crop", 220, 4.4, 340, "20-25 min", ["Nepali", "Fried"], "Momo"),
  f("Kothey Momo", "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop", 230, 4.3, 210, "20-25 min", ["Nepali", "Pan-fried"], "Momo"),
  f("Dal Bhat", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", 350, 4.7, 580, "25-30 min", ["Nepali", "Thali"], "Nepali"),
  f("Thakali Set", "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", 450, 4.8, 392, "30-35 min", ["Nepali", "Thali"], "Nepali", "FLAT Rs.100 OFF"),
  f("Sel Roti", "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop", 80, 4.0, 145, "10-15 min", ["Nepali", "Snack"], "Nepali"),
  f("Chatamari", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop", 180, 4.2, 167, "15-20 min", ["Newari", "Crepe"], "Nepali", undefined, true),
  f("Choyla", "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop", 280, 4.5, 298, "20-25 min", ["Newari", "Grilled"], "Nepali"),
  f("Sekuwa", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop", 350, 4.6, 412, "25-30 min", ["Nepali", "BBQ"], "Nepali", "20% OFF"),
  f("Aloo Tama", "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop", 200, 4.1, 134, "20-25 min", ["Nepali", "Curry"], "Nepali", undefined, true),
  f("Bara", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop", 120, 4.2, 220, "10-15 min", ["Newari", "Lentil"], "Nepali", undefined, true),
  f("Samay Baji", "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", 400, 4.7, 345, "25-30 min", ["Newari", "Platter"], "Nepali"),
  f("Pani Puri", "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop", 100, 4.3, 510, "5-10 min", ["Street Food"], "Nepali", undefined, true),
  f("Buff Chhoila", "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop", 300, 4.5, 278, "20-25 min", ["Newari", "Spicy"], "Nepali"),
  f("Sukuti", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop", 280, 4.4, 190, "10-15 min", ["Nepali", "Dried Meat"], "Nepali"),
  f("Newari Khaja", "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", 380, 4.6, 310, "25-30 min", ["Newari", "Platter"], "Nepali", "FLAT Rs.50 OFF"),
  f("Dhido", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", 200, 4.0, 110, "20-25 min", ["Nepali", "Traditional"], "Nepali", undefined, true),
  f("Yomari", "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop", 120, 4.3, 165, "15-20 min", ["Newari", "Sweet"], "Desserts"),
  f("Gundruk Jhol", "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", 150, 4.0, 98, "15-20 min", ["Nepali", "Soup"], "Nepali", undefined, true),
  f("Kwati", "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", 180, 4.1, 87, "20-25 min", ["Nepali", "Bean Soup"], "Nepali", undefined, true),
  f("Aloo Chop", "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", 80, 4.0, 190, "10-15 min", ["Street Food", "Snack"], "Nepali", undefined, true),
  f("Steam Momo", "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop", 200, 4.1, 156, "15-20 min", ["Nepali", "Momo"], "Momo"),
  f("Phapar Roti", "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop", 100, 3.9, 78, "15-20 min", ["Nepali", "Bread"], "Nepali", undefined, true),
  f("Chicken Chhoila", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop", 320, 4.4, 245, "20-25 min", ["Newari", "Grilled"], "Nepali"),

  // ─── Curries & Rice ──────────────────────────────
  f("Chicken Curry", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 320, 4.4, 340, "25-30 min", ["Indian", "Curry"], "Nepali"),
  f("Mutton Curry", "https://images.unsplash.com/photo-1545247181-516773cae754?w=400&h=300&fit=crop", 450, 4.6, 278, "35-40 min", ["Indian", "Curry"], "Nepali", "FLAT Rs.100 OFF"),
  f("Butter Chicken", "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop", 380, 4.7, 620, "25-30 min", ["Indian", "Mughlai"], "Nepali"),
  f("Paneer Butter Masala", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 300, 4.5, 410, "20-25 min", ["Indian", "Vegetarian"], "Nepali", undefined, true),
  f("Egg Curry", "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", 200, 4.2, 180, "20-25 min", ["Indian", "Curry"], "Nepali"),
  f("Fish Curry", "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop", 350, 4.3, 145, "25-30 min", ["Indian", "Seafood"], "Nepali"),
  f("Dal Makhani", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", 250, 4.5, 380, "25-30 min", ["Indian", "Lentil"], "Nepali", "20% OFF", true),
  f("Chana Masala", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 220, 4.3, 250, "20-25 min", ["Indian", "Vegetarian"], "Nepali", undefined, true),
  f("Palak Paneer", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 280, 4.4, 290, "20-25 min", ["Indian", "Vegetarian"], "Healthy", undefined, true),
  f("Chicken Biryani", "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop", 350, 4.6, 520, "30-35 min", ["Indian", "Rice"], "Biryani"),
  f("Mutton Biryani", "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop", 450, 4.7, 380, "35-40 min", ["Indian", "Rice"], "Biryani", "FLAT Rs.50 OFF"),
  f("Veg Biryani", "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop", 250, 4.2, 210, "25-30 min", ["Indian", "Vegetarian"], "Biryani", undefined, true),
  f("Fried Rice", "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop", 220, 4.1, 310, "15-20 min", ["Chinese", "Rice"], "Chinese"),
  f("Tikka Masala", "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop", 350, 4.5, 430, "25-30 min", ["Indian", "Tandoor"], "Tandoori"),
  f("Kadhai Paneer", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 300, 4.4, 260, "20-25 min", ["Indian", "Vegetarian"], "Nepali", undefined, true),
  f("Malai Kofta", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 280, 4.3, 190, "25-30 min", ["Indian", "Vegetarian"], "Nepali", undefined, true),
  f("Rajma Rice", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", 200, 4.2, 320, "20-25 min", ["Indian", "Comfort"], "Nepali", undefined, true),
  f("Mushroom Masala", "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop", 260, 4.1, 140, "20-25 min", ["Indian", "Vegetarian"], "Healthy", undefined, true),
  f("Keema Curry", "https://images.unsplash.com/photo-1545247181-516773cae754?w=400&h=300&fit=crop", 300, 4.3, 180, "25-30 min", ["Indian", "Minced"], "Nepali"),
  f("Prawn Curry", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", 500, 4.5, 160, "25-30 min", ["Indian", "Seafood"], "Nepali"),
  f("Aloo Gobi", "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop", 200, 4.1, 165, "20-25 min", ["Indian", "Vegetarian"], "Nepali", undefined, true),
  f("Jeera Rice", "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", 150, 4.1, 280, "10-15 min", ["Indian", "Rice"], "Nepali", undefined, true),
  f("Steamed Rice", "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", 80, 4.0, 400, "10-15 min", ["Sides", "Rice"], "Nepali", undefined, true),

  // ─── Snacks & Fast Food ──────────────────────────
  f("Cheese Burger", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", 280, 4.3, 450, "10-15 min", ["Burger", "American"], "Burger", "FLAT Rs.100 OFF"),
  f("Chicken Burger", "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop", 300, 4.4, 380, "10-15 min", ["Burger", "American"], "Burger"),
  f("French Fries", "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop", 150, 4.2, 510, "10-15 min", ["Snack", "Fried"], "Burger", undefined, true),
  f("Chicken Wings", "https://images.unsplash.com/photo-1527477396000-e27163b4d4fc?w=400&h=300&fit=crop", 320, 4.5, 340, "15-20 min", ["American", "Fried"], "Burger"),
  f("Pizza Margherita", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop", 350, 4.4, 480, "20-25 min", ["Pizza", "Italian"], "Pizza", undefined, true),
  f("Pepperoni Pizza", "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop", 450, 4.6, 390, "20-25 min", ["Pizza", "Italian"], "Pizza", "FLAT Rs.50 OFF"),
  f("Chicken Pizza", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop", 400, 4.5, 310, "20-25 min", ["Pizza", "Italian"], "Pizza"),
  f("Veg Pizza", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop", 320, 4.1, 270, "20-25 min", ["Pizza", "Vegetarian"], "Pizza", undefined, true),
  f("Chilli Chicken", "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop", 280, 4.3, 290, "15-20 min", ["Chinese", "Spicy"], "Chinese"),
  f("Spring Rolls", "https://images.unsplash.com/photo-1544378730-8b5104b38a67?w=400&h=300&fit=crop", 180, 4.1, 220, "10-15 min", ["Chinese", "Snack"], "Chinese", undefined, true),
  f("Samosa", "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop", 60, 4.2, 600, "5-10 min", ["Indian", "Street Food"], "Nepali", "10% OFF", true),
  f("Chowmein", "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop", 180, 4.2, 420, "15-20 min", ["Chinese", "Noodles"], "Noodles"),
  f("Thukpa", "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop", 200, 4.3, 280, "15-20 min", ["Tibetan", "Soup"], "Noodles"),
  f("Chicken Chowmein", "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop", 220, 4.3, 350, "15-20 min", ["Chinese", "Noodles"], "Noodles"),
  f("Sandwich", "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&h=300&fit=crop", 180, 4.0, 210, "10-15 min", ["Continental", "Bread"], "Bakery"),
  f("Club Sandwich", "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&h=300&fit=crop", 250, 4.2, 185, "10-15 min", ["Continental", "Bread"], "Bakery"),
  f("Chicken Nuggets", "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop", 220, 4.1, 310, "10-15 min", ["American", "Fried"], "Burger"),
  f("Nachos", "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop", 250, 4.2, 190, "10-15 min", ["Mexican", "Snack"], "Burger"),
  f("Pasta Alfredo", "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", 300, 4.4, 260, "15-20 min", ["Italian", "Pasta"], "Noodles"),
  f("Spaghetti", "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop", 280, 4.3, 240, "15-20 min", ["Italian", "Pasta"], "Noodles", "20% OFF"),
  f("Chicken Wrap", "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop", 250, 4.2, 200, "10-15 min", ["Continental", "Wrap"], "Rolls"),
  f("Garlic Bread", "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400&h=300&fit=crop", 150, 4.1, 280, "10-15 min", ["Italian", "Bread"], "Bakery", undefined, true),
  f("Buff Chowmein", "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop", 220, 4.3, 300, "15-20 min", ["Chinese", "Noodles"], "Noodles"),
  f("Hot Dog", "https://images.unsplash.com/photo-1612392062631-94e17bf42008?w=400&h=300&fit=crop", 200, 4.0, 170, "5-10 min", ["American"], "Burger"),
  f("Fish n Chips", "https://images.unsplash.com/photo-1579208030886-b1f5b7d0a8b4?w=400&h=300&fit=crop", 350, 4.3, 150, "15-20 min", ["British", "Seafood"], "Burger"),
  f("Pakora", "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop", 100, 4.1, 340, "10-15 min", ["Indian", "Snack"], "Nepali", undefined, true),
  f("Onion Rings", "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop", 160, 4.0, 190, "10-15 min", ["Snack", "Fried"], "Burger", undefined, true),

  // ─── Drinks & Desserts ───────────────────────────
  f("Masala Tea", "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop", 50, 4.5, 700, "5 min", ["Tea", "Hot"], "Drinks", undefined, true),
  f("Iced Coffee", "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop", 180, 4.3, 380, "5-10 min", ["Coffee", "Cold"], "Coffee"),
  f("Cappuccino", "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop", 200, 4.4, 320, "5-10 min", ["Coffee", "Hot"], "Coffee"),
  f("Mango Lassi", "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop", 150, 4.6, 450, "5-10 min", ["Drink", "Yogurt"], "Drinks", "FLAT Rs.30 OFF"),
  f("Fresh Lime Soda", "https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=400&h=300&fit=crop", 100, 4.2, 380, "5 min", ["Drink", "Refreshing"], "Drinks", undefined, true),
  f("Chocolate Shake", "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop", 200, 4.5, 340, "5-10 min", ["Shake", "Cold"], "Drinks"),
  f("Gulab Jamun", "https://images.unsplash.com/photo-1666190100349-f7c919c28c6f?w=400&h=300&fit=crop", 120, 4.6, 510, "5-10 min", ["Dessert", "Indian"], "Desserts", "20% OFF"),
  f("Rasgulla", "https://images.unsplash.com/photo-1666190100349-f7c919c28c6f?w=400&h=300&fit=crop", 120, 4.4, 280, "5-10 min", ["Dessert", "Indian"], "Desserts"),
  f("Jalebi", "https://images.unsplash.com/photo-1666190100349-f7c919c28c6f?w=400&h=300&fit=crop", 100, 4.5, 420, "5-10 min", ["Dessert", "Street Food"], "Desserts", undefined, true),
  f("Ice Cream", "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=300&fit=crop", 120, 4.3, 380, "5 min", ["Dessert", "Cold"], "Ice Cream"),
  f("Brownie", "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop", 200, 4.5, 290, "5-10 min", ["Dessert", "Bakery"], "Desserts"),
  f("Cheesecake", "https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=400&h=300&fit=crop", 300, 4.6, 210, "5-10 min", ["Dessert", "Bakery"], "Desserts", "FLAT Rs.50 OFF"),
  f("Tiramisu", "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop", 350, 4.7, 180, "5-10 min", ["Dessert", "Italian"], "Desserts"),
  f("Latte", "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop", 220, 4.3, 290, "5-10 min", ["Coffee", "Hot"], "Coffee"),
  f("Espresso", "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop", 150, 4.2, 240, "5 min", ["Coffee", "Hot"], "Coffee"),
  f("Green Tea", "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop", 80, 4.1, 190, "5 min", ["Tea", "Healthy"], "Healthy", undefined, true),
  f("Orange Juice", "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop", 120, 4.2, 260, "5-10 min", ["Juice", "Fresh"], "Juice"),
  f("Watermelon Juice", "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop", 120, 4.3, 230, "5-10 min", ["Juice", "Fresh"], "Juice"),
  f("Kulfi", "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=300&fit=crop", 100, 4.4, 310, "5 min", ["Dessert", "Indian"], "Ice Cream"),
  f("Fruit Salad", "https://images.unsplash.com/photo-1564093497595-593b96d80180?w=400&h=300&fit=crop", 150, 4.0, 170, "5-10 min", ["Healthy", "Fresh"], "Healthy", undefined, true),
  f("Hot Chocolate", "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop", 180, 4.4, 260, "5-10 min", ["Drink", "Hot"], "Coffee"),
  f("Smoothie Bowl", "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop", 250, 4.3, 150, "5-10 min", ["Healthy", "Cold"], "Healthy", undefined, true),
  f("Coconut Water", "https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=400&h=300&fit=crop", 80, 4.1, 200, "5 min", ["Drink", "Natural"], "Drinks", undefined, true),
  f("Chai Latte", "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop", 200, 4.3, 180, "5-10 min", ["Tea", "Hot"], "Coffee", "15% OFF"),
  f("Kheer", "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop", 150, 4.3, 200, "10-15 min", ["Dessert", "Indian"], "Desserts", undefined, true),
  f("Banana Shake", "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop", 150, 4.1, 210, "5-10 min", ["Shake", "Cold"], "Drinks"),
  f("Panna Cotta", "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop", 280, 4.5, 130, "5-10 min", ["Dessert", "Italian"], "Desserts"),
];

/* ── Filter definitions ───────────────────────────────────────────── */

const FILTERS = [
  { id: "under200", label: "Under Rs.200" },
  { id: "rating4", label: "Rating 4.0+" },
  { id: "veg", label: "Pure Veg" },
  { id: "fast", label: "Fast Delivery" },
  { id: "offers", label: "Offers" },
];

/* ── Food Card ────────────────────────────────────────────────────── */

function FoodCard({ item }: { item: FoodItem }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: cardRef }
  );

  const vegDotColor = item.isVeg ? "bg-[#1E7B3E]" : "bg-[#E23744]";
  const vegBorderColor = item.isVeg ? "border-[#1E7B3E]" : "border-[#E23744]";

  return (
    <div ref={cardRef} className="group">

      {/* ── Mobile: Swiggy-style horizontal card ── */}
      <div className="flex items-start gap-4 py-4 sm:hidden">
        {/* Left: tapping navigates to detail */}
        <Link href={`/food/${item.id}`} className="flex-1 min-w-0">
          {/* Veg / Non-veg indicator */}
          <div className={`mb-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-white`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>

          <h3 className="text-[15px] font-bold text-[#1F2A2A] leading-snug line-clamp-2">
            {item.name}
          </h3>

          {/* Rating + prep time */}
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white leading-none ${
              item.rating >= 4.0 ? "bg-[#1E7B3E]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white ml-0.5" />
            </span>
            <span className="text-[11px] text-gray-400">•</span>
            <div className="flex items-center gap-0.5">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] text-gray-500">{item.prepTime}</span>
            </div>
          </div>

          <p className="mt-0.5 text-[12px] text-gray-400 truncate">{item.tags.join(", ")}</p>

          {/* Price */}
          <p className="mt-2 text-[17px] font-extrabold text-[#1F2A2A] tracking-tight">
            Rs. {item.price}
          </p>

          {/* Offer badge */}
          {item.offer && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#F0FAF4] border border-[#1E7B3E]/20 px-2 py-1">
              <Tag className="h-3 w-3 text-[#1E7B3E] shrink-0" />
              <span className="text-[11px] font-bold text-[#1E7B3E] leading-none">{item.offer}</span>
            </div>
          )}
        </Link>

        {/* Right: image (navigates) + ADD button (adds to cart) */}
        <div className="relative shrink-0 w-27.5">
          <Link href={`/food/${item.id}`}>
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-27.5 w-27.5 rounded-2xl object-cover shadow-sm"
            />
          </Link>
          {/* ADD button — outside any <Link> so it never navigates */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <button
              onClick={() =>
                addItem(
                  { id: String(item.id), name: item.name, price: item.price, image: item.image },
                  "home",
                  "home"
                )
              }
              className="flex items-center gap-0.5 rounded-xl border-2 border-[#E23744] bg-white px-4 py-1 text-[13px] font-extrabold text-[#E23744] shadow-md whitespace-nowrap active:scale-95 transition-transform"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop: vertical card ── */}
      <Link href={`/food/${item.id}`} className="hidden sm:block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Offer badge */}
          {item.offer && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#E23744] px-2 py-1 text-[11px] font-extrabold text-white leading-none shadow-lg">
                <Tag className="h-2.5 w-2.5" />
                {item.offer}
              </span>
            </div>
          )}

          {/* Rating badge */}
          <div className="absolute bottom-2.5 right-2.5">
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-bold text-white leading-none shadow-lg ${
              item.rating >= 4.0 ? "bg-[#1E7B3E]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white" />
            </span>
          </div>

          {/* Veg indicator */}
          <div className={`absolute top-2.5 left-2.5 flex h-5 w-5 items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-white`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>
        </div>

        {/* Details */}
        <div className="mt-2.5 px-0.5">
          <h3 className="text-[15px] font-bold text-[#1F2A2A] truncate leading-snug group-hover:text-[#E23744] transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-[12px] text-gray-500">{item.prepTime}</span>
          </div>
          <p className="text-[12px] text-gray-400 truncate mt-0.5">{item.tags.join(", ")}</p>
          <p className="text-[15px] font-bold text-[#1F2A2A] mt-1">Rs. {item.price}</p>
        </div>
      </Link>

    </div>
  );
}

/* ── Main Section ─────────────────────────────────────────────────── */

export default function PopularFoods({
  activeCategory = "All",
}: {
  activeCategory?: string;
}) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowAll(false);
  };

  // Filter logic
  const filtered = useMemo(() => {
    let items = ALL_FOODS;

    // Category filter from FoodCategories
    if (activeCategory !== "All") {
      items = items.filter((i) => i.category === activeCategory);
    }

    // Pill filters
    if (activeFilters.has("under200")) items = items.filter((i) => i.price < 200);
    if (activeFilters.has("rating4")) items = items.filter((i) => i.rating >= 4.0);
    if (activeFilters.has("veg")) items = items.filter((i) => i.isVeg);
    if (activeFilters.has("fast")) items = items.filter((i) => i.prepTime.split("-")[0] && parseInt(i.prepTime) <= 15);
    if (activeFilters.has("offers")) items = items.filter((i) => i.offer);

    return items;
  }, [activeCategory, activeFilters]);

  const VISIBLE = 12;
  const displayed = showAll ? filtered : filtered.slice(0, VISIBLE);

  // GSAP header animation
  useGSAP(
    () => {
      if (!headerRef.current || !sectionRef.current) return;
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-8 md:py-12 space-y-6">
        {/* Filter pills */}
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button className="shrink-0 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:border-gray-300 transition-all">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                activeFilters.has(f.id)
                  ? "border-[#E23744] bg-[#FFF0F1] text-[#E23744]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div ref={headerRef} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E23744]/10">
            <Flame className="h-4.5 w-4.5 text-[#E23744]" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {activeCategory === "All" ? "Recommended for you" : activeCategory}
            </h2>
            <p className="text-[12px] text-gray-400">
              {filtered.length} dishes {activeCategory !== "All" ? `in ${activeCategory}` : "from popular restaurants"}
            </p>
          </div>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Sparkles className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-base font-bold text-[#1F2A2A]">No dishes found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Food grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-y-7 pb-4 sm:pb-0">
          {displayed.map((item, idx) => (
            <div key={item.id} className={idx !== 0 ? "sm:border-t-0 border-t border-gray-100" : ""}>
              <FoodCard item={item} />
            </div>
          ))}
        </div>

        {/* Show more */}
        {filtered.length > VISIBLE && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-6 py-3 text-[13px] font-bold text-[#E23744] hover:bg-[#FFF0F1] hover:border-[#E23744]/30 transition-all active:scale-[0.97] shadow-sm"
            >
              {showAll ? "Show Less" : `See all ${filtered.length} dishes`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <hr className="border-gray-100" />
      </div>
    </section>
  );
}
