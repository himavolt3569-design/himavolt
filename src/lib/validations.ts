import { z } from "zod";
import { isValidNepalMobile, normalizeNepalPhone } from "@/lib/phone";

export const phoneSchema = z
  .string()
  .trim()
  .length(10, "Phone number must be exactly 10 digits")
  .regex(/^\d{10}$/, "Phone number must contain only digits");

export const nepalMobilePhoneSchema = z
  .string()
  .trim()
  .transform((value) => normalizeNepalPhone(value))
  .refine(
    (value) => isValidNepalMobile(value),
    "Enter a real Nepal mobile number starting with 96, 97, or 98",
  );

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: nepalMobilePhoneSchema,
  countryCode: z.literal("+977").default("+977"),
  type: z.enum([
    "FAST_FOOD",
    "RESORT",
    "HOTEL",
    "BAKERY",
    "CLOUD_KITCHEN",
    "BAR",
    "CAFE",
    "RESTAURANT",
    "MO_MO_SHOP",
    "TANDOORI",
    "GUEST_HOUSE",
    "SWEETS",
  ]),
  address: z.string().trim().min(4, "Address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(50),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phoneOwnershipConfirmed: z.literal(true, {
    error: "Confirm this is your own active phone number",
  }),
});
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const updateRestaurantSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  type: z.string().optional(),
  isOpen: z.boolean().optional(),
  logo: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  description: z.string().max(500).optional(),
});

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

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(phoneSchema.optional())
    .optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().email(),
  phone: phoneSchema,
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10, "Message too short").max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  method: z.enum(["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"]),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const updatePaymentConfigSchema = z.object({
  cashEnabled: z.boolean().optional(),
  esewaEnabled: z.boolean().optional(),
  khaltiEnabled: z.boolean().optional(),
  bankEnabled: z.boolean().optional(),
  esewaMerchantCode: z.string().max(100).optional().nullable(),
  esewaSecretKey: z.string().max(200).optional().nullable(),
  khaltiSecretKey: z.string().max(200).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccountName: z.string().max(100).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  bankBranch: z.string().max(100).optional().nullable(),
});
export type UpdatePaymentConfigInput = z.infer<
  typeof updatePaymentConfigSchema
>;

// Server is the source of truth for prices. We accept name/menuItemId/quantity
// from the client, but `price` is always re-derived from the menu (or rejected
// for ad-hoc lines). `prepTime` was dropped — server reads it from menu metadata.
const orderItemSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().int().positive().max(99),
  menuItemId: z.string().min(1),
  addOns: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  tableNo: z
    .union([z.string().max(20), z.number().int()])
    .optional()
    .nullable(),
  roomNo: z.string().max(20).optional().nullable(),
  guestName: z.string().max(100).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item required").max(50),
  note: z.string().max(500).optional().nullable(),
  type: z
    .enum(["DINE_IN", "TAKEAWAY", "DELIVERY"])
    .optional()
    .default("DINE_IN"),
  paymentMethod: z
    .enum(["ESEWA", "KHALTI", "BANK", "CASH", "COUNTER", "DIRECT"])
    .optional(),
  addToOrderId: z.string().optional().nullable(), // existing order ID for cash add-on
  tableSessionId: z.string().optional().nullable(), // link to table session
  deliveryAddress: z.string().max(300).optional().nullable(),
  deliveryLat: z.number().optional().nullable(),
  deliveryLng: z.number().optional().nullable(),
  deliveryPhone: phoneSchema.optional().nullable(),
  deliveryNote: z.string().max(300).optional().nullable(),
  couponCode: z.string().max(50).optional().nullable(), // optional coupon code
  // Restaurant-scoped duplicate-submit guard (Phase 2.5c). A repeat POST with
  // the same key returns the original order instead of creating a second one.
  idempotencyKey: z.string().max(100).optional().nullable(),
  // Fast Pay: server only honors this when a staff session is present for the
  // restaurant. Customer-direct callers cannot bypass the PENDING queue.
  autoAccept: z.boolean().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().max(20).optional().default("kg"),
  quantity: z.number().min(0).optional().default(0),
  minStock: z.number().min(0).optional().default(5),
  costPerUnit: z.number().min(0).optional().default(0),
  category: z.string().max(50).optional().default("General"),
  notes: z.string().max(300).optional().nullable(),
  isDrink: z.boolean().optional().default(false),
  drinkCategory: z.string().max(50).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  showOnMenu: z.boolean().optional().default(false),
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
  isDrink: z.boolean().optional(),
  drinkCategory: z.string().max(50).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  showOnMenu: z.boolean().optional(),
});

export const createChatRoomSchema = z.object({
  orderId: z.string().min(1).optional(),
  restaurantId: z.string().min(1),
  tableNo: z.number().optional(),
  roomNo: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  sender: z.enum(["CUSTOMER", "KITCHEN", "BILLING", "ADMIN", "MANAGER"]),
  senderName: z.string().max(60).optional().nullable(),
  userId: z.string().optional().nullable(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createPaymentQRSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(50),
  imageUrl: z.string().url("Valid image URL is required"),
  sortOrder: z.number().int().min(0).optional().default(0),
});
export type CreatePaymentQRInput = z.infer<typeof createPaymentQRSchema>;

export const updatePaymentQRSchema = z.object({
  label: z.string().trim().min(1).max(50).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdatePaymentQRInput = z.infer<typeof updatePaymentQRSchema>;

export const staffLoginSchema = z.object({
  restaurantCode: z.string().min(1, "Restaurant code is required"),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must be numeric"),
  rememberMe: z.boolean().optional(),
});

export const createShiftSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:mm"),
  label: z.string().max(80).optional(),
});
export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = z.object({
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:mm")
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:mm")
    .optional(),
  label: z.string().max(80).optional(),
  actualEndTime: z.string().datetime().optional(),
});
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
