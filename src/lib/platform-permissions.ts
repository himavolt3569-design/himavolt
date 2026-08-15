/**
 * The platform permission catalogue — one source of truth for what a platform
 * staff member can be allowed to do.
 *
 * Before this existed there were two vocabularies that never matched. The role
 * builder offered `restaurants.manage`; the API checked `tenants.update`. A role
 * granted "Manage Restaurants" through the UI was therefore rejected by the very
 * routes it was meant to unlock, and `attendance.manage` — which two routes
 * require — could not be granted at all, because nothing offered it. Both the UI
 * and the guards now read this file, so the two cannot drift again.
 *
 * MASTER_ADMIN bypasses all of it (see `requireAdminPermission`); this governs
 * delegated PLATFORM_STAFF only.
 *
 * Descriptions are written for the person building a role, not for a developer.
 * They say what the holder will be able to *do*, in the words the admin panel
 * itself uses, because that is the only way someone can grant access
 * deliberately rather than by guessing at a dotted identifier.
 */

export type PermissionGroup =
  | "Businesses"
  | "Customers"
  | "Operations"
  | "Marketplace"
  | "Platform team"
  | "System";

export interface PermissionDef {
  id: string;
  /** Short name shown on the toggle. */
  label: string;
  /** Plain-language "what this lets them do", shown under the label. */
  description: string;
  group: PermissionGroup;
  /**
   * Destructive, irreversible, or a privilege escalation. Called out in the UI
   * so nobody hands it over without noticing.
   */
  danger?: boolean;
  /** Why this one deserves a second thought. Shown only when `danger`. */
  dangerNote?: string;
}

/** Group render order — broadest and most commonly delegated first. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  "Businesses",
  "Customers",
  "Operations",
  "Marketplace",
  "Platform team",
  "System",
];

export const PERMISSIONS: PermissionDef[] = [
  /* ── Businesses ────────────────────────────────────────────────────── */
  {
    id: "tenants.view",
    label: "View businesses",
    description:
      "See every restaurant and hotel on the platform, who owns it, and its order and revenue counts.",
    group: "Businesses",
  },
  {
    id: "tenants.update",
    label: "Edit businesses",
    description:
      "Fix a business on its owner's behalf: name, public link, logo and cover, address, opening hours, tax and charges, plus its menu, categories, tables, staff and rooms.",
    group: "Businesses",
  },
  {
    id: "tenants.features",
    label: "Manage feature access",
    description:
      "Force individual features on or off for a business, overriding what its type would normally include.",
    group: "Businesses",
  },
  {
    id: "tenants.impersonate",
    label: "Open owner dashboards",
    description:
      "Open any business's own dashboard as its owner, with their analytics, billing, payouts and settings.",
    group: "Businesses",
    danger: true,
    dangerNote:
      "For the length of the session they act AS the owner, so actions are recorded against the owner's account. Strictly more power than Edit businesses.",
  },
  {
    id: "tenants.suspend",
    label: "Deactivate & delete businesses",
    description:
      "Take a business offline so customers can no longer order from it, or delete it outright.",
    group: "Businesses",
    danger: true,
    dangerNote:
      "Deleting a business also permanently removes its orders, payments, bills and feedback. There is no undo.",
  },

  /* ── Customers ─────────────────────────────────────────────────────── */
  {
    id: "users.view",
    label: "View customers",
    description:
      "Open customer and owner accounts: profile, sign-in history, order history and the businesses they own.",
    group: "Customers",
  },
  {
    id: "users.manage",
    label: "Edit & block customers",
    description:
      "Change an account's name, phone, username or role, and block or unblock it.",
    group: "Customers",
    danger: true,
    dangerNote:
      "Blocking is a hard lockout — the account cannot sign in or order anywhere on the platform.",
  },
  {
    id: "venue_staff.view",
    label: "View venue staff",
    description:
      "See the waiters, chefs, cashiers and managers employed across every business, and which venue each belongs to.",
    group: "Customers",
  },

  /* ── Operations ────────────────────────────────────────────────────── */
  {
    id: "orders.view",
    label: "View all orders",
    description: "See every order placed across the platform, with its items, totals and status.",
    group: "Operations",
  },
  {
    id: "orders.manage",
    label: "Change & delete orders",
    description:
      "Move an order to another status on a venue's behalf, or remove it.",
    group: "Operations",
    danger: true,
    dangerNote: "Changing an order's status affects a live kitchen and a real customer.",
  },
  {
    id: "payments.view",
    label: "View payments",
    description:
      "See every payment and its gateway, method, status and reference.",
    group: "Operations",
  },
  {
    id: "payments.manage",
    label: "Delete payments",
    description: "Remove payment records.",
    group: "Operations",
    danger: true,
    dangerNote:
      "Payment records are the financial history of a real transaction. Deleting one breaks reconciliation for that venue.",
  },
  {
    id: "bookings.view",
    label: "View stays & bookings",
    description: "See every hotel, resort and guest-house booking with its guest and dates.",
    group: "Operations",
  },
  {
    id: "bookings.manage",
    label: "Cancel & delete bookings",
    description: "Remove a booking, freeing the room.",
    group: "Operations",
    danger: true,
    dangerNote: "A guest may have already paid an advance against the booking.",
  },
  {
    id: "deliveries.view",
    label: "View deliveries",
    description: "Track every delivery, its rider and its current stage.",
    group: "Operations",
  },
  {
    id: "deliveries.manage",
    label: "Manage deliveries",
    description: "Remove delivery records.",
    group: "Operations",
    danger: true,
  },
  {
    id: "support.manage",
    label: "Support inbox",
    description:
      "Read and reply to customer support conversations and the contact-form inbox.",
    group: "Operations",
  },

  /* ── Marketplace ───────────────────────────────────────────────────── */
  {
    id: "hardware.view",
    label: "View hardware marketplace",
    description: "See hardware listings, their sellers, and marketplace orders.",
    group: "Marketplace",
  },
  {
    id: "hardware.manage",
    label: "Manage hardware listings & orders",
    description:
      "Approve, reject, edit or archive listings, and confirm or cancel marketplace orders.",
    group: "Marketplace",
  },
  {
    id: "hardware.payout",
    label: "Hardware commission & payouts",
    description:
      "Read the per-seller commission ledger, record settlements, and set the payout method money is sent to.",
    group: "Marketplace",
    danger: true,
    dangerNote:
      "Controls where marketplace commission is actually paid out. Treat as a finance permission.",
  },

  /* ── Platform team ─────────────────────────────────────────────────── */
  {
    id: "platform_staff.manage",
    label: "Manage platform staff",
    description:
      "Add platform team members, assign their role, restrict them to specific businesses, and deactivate them.",
    group: "Platform team",
  },
  {
    id: "platform_roles.manage",
    label: "Manage roles & permissions",
    description: "Create and edit the roles on this page and the permissions they carry.",
    group: "Platform team",
    danger: true,
    dangerNote:
      "Anyone with this can grant themselves every other permission on this list. Give it to almost nobody.",
  },
  {
    id: "attendance.manage",
    label: "Staff attendance & leave",
    description:
      "Review platform staff attendance records and approve or reject their leave requests.",
    group: "Platform team",
  },

  /* ── System ────────────────────────────────────────────────────────── */
  {
    id: "analytics.view",
    label: "Platform analytics",
    description:
      "See the overview dashboard: totals, growth, and who is on the site right now.",
    group: "System",
  },
  {
    id: "audit.view",
    label: "Audit log",
    description:
      "Read the record of every action taken across the platform, including by other admins.",
    group: "System",
  },
  {
    id: "settings.manage",
    label: "Site & business info settings",
    description:
      "Edit the public site: brand details, contact information, opening hours, and the landing and hero sections.",
    group: "System",
    danger: true,
    dangerNote: "These are the details every visitor sees on the public website.",
  },
  {
    id: "gateways.manage",
    label: "Payment gateway settings",
    description:
      "View and change the eSewa, Khalti and bank credentials the platform takes money with.",
    group: "System",
    danger: true,
    dangerNote:
      "Wrong credentials here stop every payment on the platform, on every venue, immediately.",
  },
];

export const PERMISSION_IDS: string[] = PERMISSIONS.map((p) => p.id);

const BY_ID = new Map(PERMISSIONS.map((p) => [p.id, p]));

/**
 * Spellings that were offered by the old role builder and may be sitting in
 * `PlatformRole.permissions` rows today. Accepted so a role created before this
 * catalogue existed keeps working; never offered for new roles.
 */
const LEGACY_ALIASES: Record<string, string> = {
  "restaurants.view": "tenants.view",
  "restaurants.manage": "tenants.update",
};

/** Resolve a stored permission id to its canonical form. */
export function canonicalPermission(id: string): string {
  return LEGACY_ALIASES[id] ?? id;
}

export function getPermission(id: string): PermissionDef | undefined {
  return BY_ID.get(canonicalPermission(id));
}

/**
 * Does this set of granted permissions satisfy `required`?
 *
 * Both sides are canonicalised, so a role holding the legacy
 * `restaurants.manage` satisfies a route requiring `tenants.update`.
 */
export function permissionsInclude(
  granted: string[] | undefined,
  required: string,
): boolean {
  if (!granted?.length) return false;
  const want = canonicalPermission(required);
  return granted.some((g) => canonicalPermission(g) === want);
}

/** Human label for a stored id, falling back to the raw id if unrecognised. */
export function permissionLabel(id: string): string {
  return getPermission(id)?.label ?? id;
}

export function permissionsByGroup(): Record<PermissionGroup, PermissionDef[]> {
  const out = {} as Record<PermissionGroup, PermissionDef[]>;
  for (const group of PERMISSION_GROUPS) {
    out[group] = PERMISSIONS.filter((p) => p.group === group);
  }
  return out;
}
