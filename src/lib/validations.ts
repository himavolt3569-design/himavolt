import { z } from "zod";

// ─── Restaurant ────────────────────────────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(7).max(15),
  countryCode: z.string().default("+977"),
  type: z.enum([
    "FAST_FOOD",
    "RESORT",
    "HOTEL",
    "BAKERY",
    "CLOUD_KITCHEN",
    "BAR",
    "CAFE",
    "RESTAURANT",
  ]),
  address: z.string().max(200).optional().default(""),
  city: z.string().max(50).optional().default("Kathmandu"),
});
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const updateRestaurantSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(7).max(15).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  type: z.string().optional(),
  isOpen: z.boolean().optional(),
  logo: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  description: z.string().max(500).optional(),
});

// ─── Menu Item ─────────────────────────────────────────────────────────────────

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().nullable(),
  prepTime: z.string().max(30).optional().default("15-20 min"),
  isVeg: z.boolean().optional().default(false),
  hasEgg: z.boolean().optional().default(false),
  hasOnionGarlic: z.boolean().optional().default(true),
  badge: z.string().max(30).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  discount: z.number().min(0).max(100).optional().default(0),
  discountLabel: z.string().max(50).optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  categoryId: z.string().min(1, "Category is required"),
  sizes: z
    .array(z.object({ label: z.string(), price: z.number().positive() }))
    .optional(),
  addOns: z
    .array(z.object({ name: z.string(), price: z.number().min(0) }))
    .optional(),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

// ─── Staff ─────────────────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().email(),
  phone: z.string().max(15).optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// ─── Contact ───────────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().email(),
  phone: z.string().max(15).optional(),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10, "Message too short").max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

// ─── Payment ───────────────────────────────────────────────────────────────────

export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  method: z.enum(["CASH", "ESEWA", "KHALTI", "BANK"]),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

// ─── Order ─────────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  menuItemId: z.string().optional(),
  prepTime: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableNo: z.string().max(20).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
  note: z.string().max(500).optional().nullable(),
  type: z
    .enum(["DINE_IN", "TAKEAWAY", "DELIVERY"])
    .optional()
    .default("DINE_IN"),
  paymentMethod: z.string().optional(),
  deliveryAddress: z.string().max(300).optional().nullable(),
  deliveryLat: z.number().optional().nullable(),
  deliveryLng: z.number().optional().nullable(),
  deliveryPhone: z.string().max(20).optional().nullable(),
  deliveryNote: z.string().max(300).optional().nullable(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── Inventory ─────────────────────────────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().max(20).optional().default("kg"),
  quantity: z.number().min(0).optional().default(0),
  minStock: z.number().min(0).optional().default(5),
  costPerUnit: z.number().min(0).optional().default(0),
  category: z.string().max(50).optional().default("General"),
  notes: z.string().max(300).optional().nullable(),
});
export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;

export const updateInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  unit: z.string().max(20).optional(),
  quantity: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(300).optional().nullable(),
});

// ─── Chat ──────────────────────────────────────────────────────────────────────

export const createChatRoomSchema = z.object({
  orderId: z.string().min(1),
  restaurantId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  sender: z.enum(["CUSTOMER", "KITCHEN", "BILLING"]),
  senderName: z.string().max(60).optional().nullable(),
  userId: z.string().optional().nullable(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ─── Staff Login ───────────────────────────────────────────────────────────────

export const staffLoginSchema = z.object({
  restaurantCode: z.string().min(1, "Restaurant code is required"),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must be numeric"),
});
