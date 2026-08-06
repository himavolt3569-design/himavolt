import { z } from "zod";
import { isValidNepalMobile, normalizeNepalPhone } from "@/lib/phone";
import { MINUTES_PER_DAY, isValidWindow } from "@/lib/hours";

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

/* ── Operating hours, capabilities & delivery ───────────────────────
 * Hours are stored as minutes from midnight in the RESTAURANT's timezone.
 * `closeMin` may exceed 1440 to express an overnight window in one row
 * (18:00–02:00 is 1080 → 1560). See src/lib/hours.ts.
 */

export const serviceTypeSchema = z.enum(["DINE_IN", "DELIVERY", "PICKUP"]);

export const hoursWindowSchema = z
  .object({
    serviceType: serviceTypeSchema,
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean().default(false),
    openMin: z.number().int().min(0).max(MINUTES_PER_DAY - 1),
    closeMin: z.number().int().min(1).max(MINUTES_PER_DAY * 2),
  })
  .refine(
    (w) => w.isClosed || isValidWindow(w.openMin, w.closeMin),
    "Closing time must be after opening time, and a window cannot exceed 24 hours",
  );

export const setHoursSchema = z.object({
  // 3 services × 7 days is the ceiling; anything larger is a malformed client.
  hours: z.array(hoursWindowSchema).max(21),
});

/** `ALL` is a real value, not a null — see the schema comment on the enum. */
export const specialHoursScopeSchema = z.enum([
  "ALL",
  "DINE_IN",
  "DELIVERY",
  "PICKUP",
]);

export const specialHoursSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    serviceType: specialHoursScopeSchema.default("ALL"),
    isClosed: z.boolean().default(true),
    openMin: z.number().int().min(0).max(MINUTES_PER_DAY - 1).nullable().default(null),
    closeMin: z.number().int().min(1).max(MINUTES_PER_DAY * 2).nullable().default(null),
    reason: z.string().trim().max(120).optional().nullable(),
  })
  .refine(
    (s) =>
      s.isClosed ||
      (s.openMin != null && s.closeMin != null && isValidWindow(s.openMin, s.closeMin)),
    "Give an opening and closing time, or mark the day closed",
  );

export const updateCapabilitySchema = z.object({
  dineInEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
  codMaxAmount: z.number().min(0).max(1_000_000).optional(),
  liveTrackingEnabled: z.boolean().optional(),
  deliveryRadiusKm: z.number().min(0.5).max(50).optional(),
  deliveryPrepMins: z.number().int().min(0).max(240).optional(),
  mergeBillingOrders: z.boolean().optional(),
});

/** Money fields are bounded so a negative or absurd rate can never reach a fee. */
export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, "Zone name is required").max(60),
  baseFee: z.number().min(0).max(100_000).default(50),
  perKmFee: z.number().min(0).max(10_000).default(15),
  freeAbove: z.number().min(0).max(1_000_000).nullable().default(null),
  maxRadiusKm: z.number().min(0.5).max(50).default(10),
});

/**
 * Proximity search. Sent as a POST body, never a query string — customer
 * coordinates must not land in a URL, a server log or a CDN cache key.
 * Radius is clamped server-side so this cannot be used to dump the whole table.
 */
export const nearbySearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.5).max(25).default(5),
  kind: z.enum(["all", "food", "drinks"]).default("all"),
  openNow: z.boolean().default(false),
  // Defaults false: browsing "what's near me" includes the dine-in-only hotel.
  deliveryOnly: z.boolean().default(false),
  // Bounded by the number of RestaurantType values that exist, so a caller
  // cannot send a giant array to bloat the IN clause.
  types: z.array(z.string().max(40)).max(12).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(50).default(20),
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

// ── Expenses (cost side of the Profit & Loss statement) ──────────────────────
export const EXPENSE_CATEGORIES = [
  "INGREDIENTS",
  "SALARIES",
  "RENT",
  "UTILITIES",
  "MARKETING",
  "EQUIPMENT",
  "MAINTENANCE",
  "SUPPLIES",
  "OTHER",
] as const;
export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number];

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1_000_000_000, "Amount is too large"),
  note: z.string().trim().max(200).optional(),
  // "YYYY-MM-DD" (or a full ISO datetime). Server defaults to now when absent.
  incurredAt: z.string().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ─── Hardware marketplace ────────────────────────────────────────────

const HARDWARE_TYPES = ["Terminal", "Screen", "Printer", "Accessory"] as const;

const httpUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((u) => u.startsWith("https://") || u.startsWith("http://"), {
    message: "Must be an http(s) URL",
  });

/** Phone + email are BOTH required across the marketplace (traceability). */
const requiredEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(200);

/** Public seller submission — no account required. */
export const hardwareListingSubmitSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  description: z.string().trim().min(10, "Add a short description").max(2000),
  type: z.enum(HARDWARE_TYPES),
  price: z.number().positive("Price must be greater than 0").max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000).default(1),
  imageUrl: httpUrl.optional().or(z.literal("")),
  sellerName: z.string().trim().min(2, "Your name is required").max(120),
  sellerPhone: nepalMobilePhoneSchema,
  sellerEmail: requiredEmail,
  sellerPayoutNote: z
    .string()
    .trim()
    .min(4, "Tell buyers how to pay you")
    .max(500),
  sellerPaymentQr: httpUrl.optional().or(z.literal("")),
});
export type HardwareListingSubmitInput = z.infer<typeof hardwareListingSubmitSchema>;

/** Buyer places an order. Server derives all prices from the listing. */
export const hardwareOrderCreateSchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(1000).default(1),
  buyerName: z.string().trim().min(2, "Your name is required").max(120),
  buyerPhone: nepalMobilePhoneSchema,
  buyerEmail: requiredEmail,
  shippingAddress: z.string().trim().min(6, "Delivery address is required").max(300),
});
export type HardwareOrderCreateInput = z.infer<typeof hardwareOrderCreateSchema>;

/** Buyer uploads payment proof. */
export const hardwareProofSchema = z.object({ proofUrl: httpUrl });
export type HardwareProofInput = z.infer<typeof hardwareProofSchema>;

/** Admin creates/edits a listing (platform or third-party). */
export const hardwareListingAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  type: z.enum(HARDWARE_TYPES),
  price: z.number().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: httpUrl.optional().or(z.literal("")),
  sellerName: z.string().trim().max(120).optional(),
  sellerPhone: z.string().trim().max(20).optional(),
  sellerPayoutNote: z.string().trim().max(500).optional(),
});
export type HardwareListingAdminInput = z.infer<typeof hardwareListingAdminSchema>;

/** Admin sets the platform's commission payout method. */
export const hardwarePayoutMethodSchema = z.object({
  method: z.string().trim().min(1).max(40),
  label: z.string().trim().max(120).default(""),
  identifier: z.string().trim().max(200).default(""),
  instructions: z.string().trim().max(1000).default(""),
});
export type HardwarePayoutMethodInput = z.infer<typeof hardwarePayoutMethodSchema>;

/** Admin records a commission settlement against a listing. */
export const hardwareSettlementSchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  amount: z.number().positive("Amount must be greater than 0").max(100_000_000),
  note: z.string().trim().max(300).optional(),
});
export type HardwareSettlementInput = z.infer<typeof hardwareSettlementSchema>;
