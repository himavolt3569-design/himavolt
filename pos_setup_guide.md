# How to Set Up POS for Official Hotels — Step-by-Step

This guide walks you through setting up the Point of Sale (POS) system for a **HOTEL**, **RESORT**, or **GUEST_HOUSE** type restaurant on your himalhub website.

---

## Prerequisites

Before you begin, make sure:
- You have a **himalhub account** signed in as an **OWNER** role
- Your `.env` file has the required environment variables configured (database, Supabase, etc.)
- The app is deployed (Vercel) or running locally (`pnpm dev`)

---

## Step 1: Create Your Hotel as a Restaurant

1. **Go to** `/manage-restaurants` — this is the restaurant management page
2. **Click "Create Restaurant"** — this opens the [CreateRestaurantModal](file:///d:/himalhub/src/components/modals/CreateRestaurantModal.tsx)
3. **Fill in the details:**
   - **Name** — e.g. "Grand Himalaya Hotel"
   - **Type** — Select **`HOTEL`**, **`RESORT`**, or **`GUEST_HOUSE`** from the dropdown
     - This is critical because the type determines which features are available (see [restaurant-types.ts](file:///d:/himalhub/src/lib/restaurant-types.ts#L208-L220))
   - **Location** — Enter your address (uses Nominatim geocoding)
   - **Other fields** — description, image, etc.
4. **Submit** — your hotel is now created and appears in the restaurant list

> [!IMPORTANT]
> The restaurant **type** (`HOTEL`, `RESORT`, `GUEST_HOUSE`) unlocks hotel-specific features: Room Management, Room Bookings, Hotel QR, Room QR Codes, Guest Check-In, Guest Billing, Room Service, and Buffet Manager.

---

## Step 2: Set Up Your Menu

Before the POS can take orders, you need menu items.

1. **Go to Dashboard** → Select your hotel from the sidebar restaurant switcher
2. **Navigate to** `Dashboard → Menu` tab (or `/dashboard/menu`)
3. **Create categories first** — e.g. "Breakfast", "Room Service Menu", "Drinks", "Dinner"
   - The system also supports **seeding default categories** per restaurant type via the API at `/api/restaurants/[id]/categories/seed`
4. **Add menu items** to each category:
   - Name, price, description, image
   - Optionally: sizes (Small/Medium/Large with price add-ons), add-ons, spice level, veg/non-veg flag, discount %
5. **Toggle the restaurant to "Open"** — this makes it visible and orderable

> [!TIP]
> You can use **bulk category seeding** by hitting `POST /api/restaurants/{id}/categories/seed` which generates type-appropriate categories automatically.

---

## Step 3: Set Up Rooms (Hotel-Specific)

Since your restaurant type is `HOTEL`/`RESORT`/`GUEST_HOUSE`, the **Rooms** tab is automatically available in the dashboard sidebar.

1. **Navigate to** `Dashboard → Rooms` (or `/dashboard/rooms`)
   - This loads the [RoomManagementTab](file:///d:/himalhub/src/components/dashboard/RoomManagementTab.tsx) component
2. **Click "Add Room"** and fill in:
   - **Room Number** — e.g. "101"
   - **Name** — e.g. "Mountain View Deluxe"
   - **Type** — `STANDARD`, `DELUXE`, or `SUITE`
   - **Floor** — floor number
   - **Price/Night** — in NPR
   - **Max Guests** — e.g. 2
   - **Bed Type** — King, Queen, Twin, Single, Double, or Bunk Bed
   - **Bed Count** — how many beds
   - **Description** — optional
   - **Amenities** — comma-separated: "WiFi, AC, TV, Mini Bar"
   - **Photos** — upload room images
   - **Available** toggle — mark as available/occupied
3. **Repeat** for all rooms
4. Each room gets a **QR code** automatically that links to `/hotel/{slug}/room/{roomNumber}` — guests can scan this to view room details or order room service

---

## Step 4: Configure Hotel-Specific Settings

### 4a. Hotel Advance/Deposit Config

1. **API endpoint**: `PATCH /api/restaurants/{id}/hotel-config`
   - Set `hotelAdvanceType`: `"PERCENTAGE"` or `"FIXED"`
   - Set `hotelAdvanceValue`: e.g. `50` (for 50% advance) or `2000` (for Rs. 2000 fixed)
   - Only the **owner** can change this

### 4b. Hotel Hub

1. **Navigate to** `Dashboard → Hotel Hub` (or `/dashboard/hotel-hub`)
   - This is the central hub for hotel-specific features visible in the sidebar for `HOTEL`/`RESORT`/`GUEST_HOUSE` types
   - Access: Hotel Bookings, Hotel QR Code, Room QR Codes, Guest Check-In, Room Service, Guest Billing

### 4c. Room Bookings

1. **Navigate to** `Dashboard → Hotel Bookings` (or `/dashboard/hotel-bookings`)
   - View and manage guest bookings
   - Create manual bookings
   - Track check-in/check-out statuses: `CONFIRMED` → `CHECKED_IN` → `CHECKED_OUT` (or `CANCELLED`)

### 4d. Hotel QR Code

1. **Navigate to** `Dashboard → Hotel QR` (or `/dashboard/hotel-qr`)
   - Generates a QR code linking to your hotel's **public booking page**: `/hotel/{slug}`
   - Guests scan this to browse rooms and make online bookings

### 4e. Room QR Codes

1. **Navigate to** `Dashboard → Room QR Codes` (or `/dashboard/room-qr-codes`)
   - Individual QR codes per room for room service ordering
   - Each QR links to `/hotel/{slug}/room/{roomNumber}`

---

## Step 5: Activate the POS Terminal ⚡

This is the main step. POS activation is done from the Dashboard.

### Method A: First-Time Welcome Tour (Automatic)

When you first open the dashboard with your hotel selected, the system checks if you've seen the **POS Welcome Tour** ([POSWelcomeTour](file:///d:/himalhub/src/components/pos/activation/POSWelcomeTour.tsx)):

1. A welcome modal appears explaining what POS can do
2. Click **"Activate POS"** to proceed to the wizard
3. (Or click "Skip" to dismiss — you can activate later)

### Method B: From the Sidebar (Manual)

1. In the dashboard sidebar, look for the **"Set up POS"** button at the bottom ([POSLauncher](file:///d:/himalhub/src/components/pos/activation/POSLauncher.tsx))
   - Shows as a pulsing dot when POS hasn't been activated yet
2. Click it to open the POS Activation Wizard

### The POS Activation Wizard (4 Steps)

The wizard ([POSActivationWizard](file:///d:/himalhub/src/components/pos/activation/POSActivationWizard.tsx)) walks you through:

#### Step 1: Terminal Setup
- **Terminal Name** — e.g. "Front Counter", "Bar", "Reception"
  - Shows on the POS header and on printed bills
- **Customer-facing mode** — toggle on/off
  - When enabled, staff can hand the screen to a customer so they can browse the 3D menu. Billing totals stay hidden.
  - Configure the **exit key combination** (default: `Ctrl + Shift + X`) — this is what staff press to exit customer mode

#### Step 2: Tax & Charges
- **Tax (VAT)** — toggle on/off, set rate (default: 13% for Nepal)
- **Service Charge** — toggle on/off, set rate (default: 10%)
- These apply to every POS bill

#### Step 3: Opening Cash Drawer
- **Opening balance** — how much cash (NPR) is in the drawer at shift start
- Used for end-of-day reconciliation
- Common values: Rs. 1,000 / 2,000 / 5,000

#### Step 4: Review & Activate
- Review all settings
- Click **"Activate POS"**
- The system calls `POST /api/restaurants/{id}/pos/activate` which:
  - Sets `posEnabled = true` on the restaurant
  - Records `posActivatedAt` timestamp
  - Saves terminal name, opening cash, tax/service settings, customer mode config
  - Creates an audit log entry

#### ✅ Done!
- You see a **"POS is live"** confirmation
- Your **restaurant code** is displayed — share this with staff for login
- Click **"Open POS terminal"** to go to `/pos/staff`

---

## Step 6: Staff Onboarding

Staff need to be able to log in to use the POS.

1. **Go to** `Dashboard → Staff` tab
2. **Add staff members** with:
   - Name, role (WAITER, CASHIER, KITCHEN, MANAGER, etc.)
   - Set a **PIN** for each staff member (used for staff login)
3. **Share the Restaurant Code** with your staff
   - This code was shown during POS activation
   - Staff use it at `/staff-login` along with their PIN

### Staff Login Flow
1. Staff goes to `/staff-login`
2. Enters the **Restaurant Code** (identifies which restaurant)
3. Enters their **PIN**
4. Gets a staff JWT cookie — now they can access POS and kitchen displays

---

## Step 7: Using the POS Terminal

### Staff POS (`/pos/staff`)

1. Navigate to `/pos/staff` (or click "Open POS" from the sidebar)
   - This loads [POSTerminal](file:///d:/himalhub/src/components/pos/terminal/POSTerminal.tsx)
2. **Main features:**
   - **Menu Grid** — browse categories, search items ([POSMenuGrid](file:///d:/himalhub/src/components/pos/staff/POSMenuGrid.tsx))
   - **Order Panel** — add items, customize sizes/add-ons, set quantities ([POSOrderPanel](file:///d:/himalhub/src/components/pos/staff/POSOrderPanel.tsx))
   - **Table View** — assign orders to tables ([POSTableView](file:///d:/himalhub/src/components/pos/staff/POSTableView.tsx))
   - **3D Tables View** — interactive 3D table layout ([POSTables3DView](file:///d:/himalhub/src/components/pos/terminal/POSTables3DView.tsx))
   - **Billing** — generate bills, apply tax/service charge ([POSBilling](file:///d:/himalhub/src/components/pos/staff/POSBilling.tsx))
   - **Split Bill** — split orders across multiple payments ([POSSplitBill](file:///d:/himalhub/src/components/pos/staff/POSSplitBill.tsx))
   - **Active Orders** — track current orders ([POSActiveOrders](file:///d:/himalhub/src/components/pos/staff/POSActiveOrders.tsx))
   - **Held Orders** — park orders for later ([POSHeldOrders](file:///d:/himalhub/src/components/pos/staff/POSHeldOrders.tsx))
   - **Daily Summary** — end-of-day cash reconciliation ([POSDailySummary](file:///d:/himalhub/src/components/pos/staff/POSDailySummary.tsx))
   - **Cash Register** — track cash in/out ([POSRegister](file:///d:/himalhub/src/components/pos/staff/POSRegister.tsx))
   - **Customer Mode** — hand screen to customer for 3D menu browsing ([POSCustomerMode](file:///d:/himalhub/src/components/pos/terminal/POSCustomerMode.tsx))
   - **Payment QR Overlay** — show QR for digital payment scanning ([POSPaymentQROverlay](file:///d:/himalhub/src/components/pos/terminal/POSPaymentQROverlay.tsx))

### Self-Service Kiosk (`/pos/{slug}`)

1. Navigate to `/pos/{your-hotel-slug}`
   - This loads the customer-facing [KioskPage](file:///d:/himalhub/src/app/pos/%5Bslug%5D/page.tsx)
2. Customers can:
   - Browse the menu
   - Add items to cart with sizes/add-ons
   - Choose Dine-in or Takeaway
   - Select table number (for dine-in)
   - Place orders (goes to `COUNTER` payment by default)
3. **Requires POS to be enabled** — if `posEnabled` is false, shows a "not available" message

---

## Step 8: Connect to Kitchen Display (KDS)

1. Kitchen staff go to `/kitchen`
2. This shows the **Kitchen Display System** — live orders stream in via SSE
3. Kitchen marks items as preparing → ready → served

---

## Summary of URLs

| URL | Purpose | Who Uses It |
|-----|---------|-------------|
| `/manage-restaurants` | Create/manage hotel entities | Owner |
| `/dashboard` | Main dashboard for all management | Owner + Staff |
| `/dashboard/rooms` | Room management | Owner + Manager |
| `/dashboard/hotel-bookings` | Booking management | Owner + Manager |
| `/dashboard/hotel-hub` | Central hotel features hub | Owner + Manager |
| `/dashboard/hotel-qr` | Hotel booking QR code | Owner |
| `/dashboard/room-qr-codes` | Per-room QR codes | Owner |
| `/pos/staff` | Staff POS terminal | Staff (after login) |
| `/pos/{slug}` | Self-service kiosk | Customers |
| `/hotel/{slug}` | Public hotel booking page | Guests |
| `/hotel/{slug}/room/{roomNo}` | Room detail + room service | Guests |
| `/kitchen` | Kitchen display system | Kitchen staff |
| `/staff-login` | Staff authentication | Staff |

---

## Quick Checklist

- [ ] Create hotel with type `HOTEL`/`RESORT`/`GUEST_HOUSE`
- [ ] Add menu categories & items
- [ ] Set up rooms (number, type, price, amenities, photos)
- [ ] Configure hotel advance deposit settings
- [ ] Activate POS via the wizard (terminal name, tax, service charge, opening cash)
- [ ] Add staff members with PINs
- [ ] Share restaurant code with staff
- [ ] Print/display Room QR codes in each room
- [ ] Print/display Hotel QR code at reception
- [ ] Set up kiosk tablet at `/pos/{slug}` if desired
- [ ] Connect kitchen display at `/kitchen`
