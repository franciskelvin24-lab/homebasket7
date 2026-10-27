# HomeBasket

*Everyday essentials, delivered.*

A mobile-first online store for a Nigerian everyday-essentials sourcing and delivery business, built with plain **HTML, CSS and JavaScript** (no frameworks, no build step). It has no backend yet: orders reach your team through **WhatsApp**, and the internal admin, supplier and delivery tools run inside the browser.

## Run it

1. Open the `homebasket` folder in VS Code.
2. Install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.
   (Any static server works, and double-clicking `index.html` also works.)

## How orders reach you today

There is no server, so an order is only truly received when the customer **presses Send in WhatsApp**. Checkout prepares the message (reference, items, quantities, estimated total, address, delivery choice). The customer also gets an order reference that works for tracking **on the same device and browser tab**.

Your number is set in **`assets/js/config.js`**:

```js
WHATSAPP_NUMBER: "2349161595968",
```

Use international format, **digits only, no "+" or spaces** (e.g. `"2348012345678"`). Until you do, WhatsApp buttons show a short message instead of a broken link.

## Pre-launch checklist (what you must replace)

- [x] `WHATSAPP_NUMBER` is set to HomeBasket's WhatsApp Business number (`2349161595968`, i.e. 0916 159 5968). To change it later, edit `assets/js/config.js` (international digits only, no "+" or spaces).
- [ ] Contact phone, email and business hours in `config.js` (leave empty to hide them in the footer)
- [ ] **Prices, units and stock status** in `assets/js/products.js` (working figures, confirm with suppliers). The admin Products screen edits them for the current browser session only; permanent changes go in the file.
- [ ] Product photos: add files to `assets/images/` using the names in `products.js`, then set `USE_PRODUCT_PHOTOS: true`
- [ ] Suppliers, delivery partners and **delivery areas/fees** in `assets/js/business-data.js` (the generic names, phone numbers and areas are working values; the owner must confirm real coverage before launch)
- [ ] Payment wording: the site says "Payment details are shared by our team when your order is confirmed". Change it if you agree different terms.
- [ ] Add privacy and terms pages before collecting real customer details
- [ ] Keep `LOAD_SAMPLE_RECORDS: false` in `config.js` for a clean store. Set it to `true` only when you want to try the admin, supplier and delivery tools with pre-filled orders.
- [ ] **Do not publish the admin, supplier or delivery pages publicly** (see below)

## Pages

| Page | File |
|---|---|
| Home | `index.html` |
| Shop, Cart, Checkout | `pages/shop.html`, `cart.html`, `checkout.html` |
| Business supplies / quotation | `pages/business-supplies.html` |
| Restock (saved baskets) | `pages/saved-baskets.html` |
| Sign in, Create account, Forgot password, My account (demonstration) | `pages/login.html`, `create-account.html`, `forgot-password.html`, `my-account.html` |
| Track order | `pages/track-order.html` |
| Admin | `pages/admin.html` |
| Supplier area | `pages/supplier-portal.html` |
| Delivery partner area | `pages/delivery-portal.html` |

The admin, supplier and delivery pages are internal tools. They are not linked from the public site and are marked `noindex`.

## Business model: managed marketplace

- Customers see **one HomeBasket price** per product.
- Supplier names, costs, comparisons and margins appear only in the admin area. The customer order view is produced by the service layer (`getOrderByReference(ref, { audience: "customer" })`) so supplier data cannot leak into customer pages.
- Order flow: customer order → grouped by each product's chosen supplier → **one sourcing request per supplier containing only that supplier's items** → supplier accepts/declines with a proposed price and quantity → admin prepares a final quotation (one price per item plus disclosed fees) → if anything differs from what the customer saw, the customer approves first → sourcing, packing, delivery. Customer order status, supplier sourcing status and delivery status are tracked separately and linked. Prices are snapshotted so accepted prices never change silently.

## Try the internal tools

1. Place an order on the shop.
2. Open `pages/admin.html#orders`, open the order, **Prepare final quotation**, send it for approval (or confirm if nothing changed), then **Mark Sourcing**.
3. Open the **Supplier area**, choose the supplier account and accept the request.
4. Back in admin, mark the order **Packed** and assign a delivery partner.
5. Open the **Delivery area**, choose the partner and work through Accept → Picked up → Out for delivery → Delivered.
6. Check the order on the **Track order** page.

## Where data lives

| Data | Stored in | Lasts |
|---|---|---|
| Cart (product IDs and quantities only) | `localStorage` | Until cleared |
| Saved baskets (owner, name, product IDs, quantities) | `localStorage` | Until cleared |
| Demonstration accounts (name, email, phone; never passwords) and sign-in marker | `sessionStorage` | Until the tab closes |
| Orders, sourcing requests, quotations, deliveries, notification log | `sessionStorage` (one browser tab) | Survives page changes, **lost when the tab closes** |
| Catalogue edits made in admin | same session store | same |

Nothing syncs across devices or between people. Never type passwords or payment details into the site.

## Supplier notifications

The notification log (admin → Sourcing) records what would be sent to each supplier: **Queued**, **Failed** (for example an unverified contact) or **Awaiting Integration**. **No message is sent automatically.** Use the "Contact manually" button to open a prepared WhatsApp message yourself.

Real automatic notifications need a backend and an approved provider:
- WhatsApp Business Platform (a verified Meta business account, a number, approved message templates, and its charges), or an SMS gateway, or email.
- Use the supplier's verified preferred channel and send only that request's details.
- Record provider message IDs, timestamps, delivery results and errors.
- Receive supplier replies through a verified provider webhook.
- Keep credentials on the server only. Never put keys in browser JavaScript.
- A normal `wa.me` click-to-chat link cannot send background messages.

## Service layer (ready for a backend)

All interface code calls `HB.api.*` in `assets/js/store.js` (they return Promises): `getProducts`, `createOrder`, `getOrderByReference`, `getSuppliers`, `createSourcingRequest`, `updateSourcingRequest`, `createSupplierNotification`, `getNotificationLog`, `getDeliveryAssignments`, `assignDelivery`, `updateDeliveryStatus`, `submitBusinessQuoteRequest`, `prepareFinalQuotation`, `recordCustomerQuotationApproval` (plus supporting functions). Inputs are validated inside them as a server would. To go live, replace their bodies with `fetch()` calls to your backend.

## What a production launch needs

- A real **database** and **server-side validation** (prices and stock re-checked on the server)
- Secure **sign-in** for customers, admin, suppliers and delivery partners, with **role-based permissions** (a supplier sees only their own requests; a rider only their assigned deliveries)
- Server-side **order routing** and **supplier notifications**
- **Secure payments** (for example Paystack) with server-side verification, and refund handling
- History for orders, supplier prices, quotations, deliveries and refunds
- Customer data protection under the Nigeria Data Protection Act, a privacy notice, and retention rules
- **Audit logs** for important admin actions
- Rate limiting, safe error handling, backups and a tested recovery plan
- Live tracking only if a real tracking provider is added; the current timeline shows statuses entered by your team

## Important: no login yet

The admin, supplier and delivery pages have **no secure sign-in**. The supplier and delivery pages use an account picker, which is **not** security. Do not publish these pages to the public internet until real authentication exists.

## Home page hero photo

The home page hero shows the HomeBasket basket photo (`assets/images/hero.jpg`) with the caption "Total Service: Household & Business Supplies". To change the photo, replace `hero.jpg` with another image of the same proportions (about 1376 x 768, light grey background works best). To change the caption, edit the `hero-caption` line in `index.html`. The crop and the soft edges are set in the "Home hero" section at the end of `assets/css/components.css`. The basket in `hero.jpg` has been recoloured from blue to the site green; the untouched original is kept as `assets/images/hero-original.jpg` if you ever want it back.

## Logo

The logo is the HomeBasket basket with a house roof and a leaf, redrawn in the website palette (basket `#176B45`, roof `#104B34`, leaf `#F4C95D`, wordmark in dark green and green). It replaces the earlier blue version.

Files in `assets/images/`:
- `logo.svg` / `logo.png`: full logo with the name, for light backgrounds
- `logo-white.svg` / `logo-white.png`: light version for dark green backgrounds
- `logo-mark.svg` / `logo-mark.png`: the symbol alone
- `favicon.svg`, `favicon-32.png`, `favicon-512.png`, `apple-touch-icon.png`: browser tab and phone home-screen icons

In the website the header, footer and admin screens draw the mark inline from `assets/js/app.js` (the `LOGO` constant), with the name as live text so it stays sharp. The footer automatically uses the light colours. To recolour it, change the three `--logo-basket`, `--logo-roof` and `--logo-leaf` values in `assets/css/styles.css` (footer) or the default colours in `app.js`. In the SVG and PNG files the name is set in Inter (falling back to Arial): if you need the name outlined as shapes for printing, open `logo.svg` in a design tool and convert the text to outlines.

## Latest update: accounts and the data-access layer

### Sign-in pages (demonstration only)
`pages/login.html`, `create-account.html`, `forgot-password.html` and `my-account.html`, plus a person icon in the header. **Everything public stays public:** shop, cart, checkout, quotes, tracking and saved baskets all work without an account.

These pages are clearly labelled as a **demonstration**. There is **no real authentication**:
- A signed-in state is a marker kept in this browser tab only. Closing the tab ends it.
- Passwords are checked for format (8 or more characters when creating an account) and then **discarded**. They are never stored, hashed or verified, so "signing in" only needs an email that was registered in this tab.
- "Forgot password" sends **nothing**; it only explains how resets will work.
- My Account shows your details (editable), your saved-basket count, and orders placed on this device while signed in, with their customer-facing status. Sample orders are labelled **Sample order**.
- Signed-in customers get checkout and business-quote forms pre-filled with their name and phone.

### Data-access layer (`assets/js/data-access.js`)
All browser storage is read and written in this one file. Nowhere else calls `localStorage` or `sessionStorage`.
- `HB.storage`: a tiny adapter (`read`, `write`, `remove`) with safe handling for blocked or corrupt storage.
- `HB.data.customers`, `savedBaskets`, `products`, `quotations`, `orders`, `zones`: repositories that return Promises, exactly like a backend client would.
- Every UI file (cart, saved baskets, checkout, tracking, business form, account pages) uses these repositories. `HB.api` in `store.js` remains the full service layer, including the admin, supplier and delivery tools.
- **To connect a real backend:** replace the bodies of the repository functions with `fetch()` calls to your API and keep the same return shapes. The pages, forms and UI code do not change. Identifiers are consistent strings (`cus-…`, `b…`, `HB-1001`, `BQ-…`, `Q-…`).

### Demonstration-only features
- Account sign-in, account creation, password reset and "My account" (simulated, tab-only, no password checking).
- Sample orders and sample admin records, only when `LOAD_SAMPLE_RECORDS` is `true` (default `false`).
- Order records, sourcing requests and status changes (kept in this browser tab; changed by hand in the admin area, not automatically).
- Supplier notifications (a log only; nothing is sent).

### Test it locally
1. Open the folder with Live Server and open `index.html`.
2. **Account:** Create an account, check My Account, sign out, sign back in with the same email, then try an unknown email.
3. **Saved baskets:** add items, open the cart, **Save this basket**, then open **Restock**, edit quantities, rename, delete and add to cart.
4. **Business quote:** fill in `pages/business-supplies.html`, review, confirm, then use Send on WhatsApp (set `WHATSAPP_NUMBER` first).
5. **Order updates:** place an order while signed in, then find it in My Account and on `pages/track-order.html`. Set `LOAD_SAMPLE_RECORDS: true` to see sample orders in every stage (HB-1001 to HB-1006).

### Before production launch
- A database and server-side validation, and a backend behind the repositories above
- **Real authentication**: hashed passwords, secure sessions, email verification and a working password reset
- Accounts that follow customers across devices, with their saved baskets and orders
- Server-side order, quotation and status storage; secure payments with server-side verification
- Automatic supplier notifications through an approved provider
- Privacy notice and terms (Nigeria Data Protection Act), audit logs, rate limiting, backups
- Protect the admin, supplier and delivery pages behind real sign-in

## What's new

### Restock My Basket (`pages/saved-baskets.html`, `assets/js/saved-baskets.js`)
- On the cart page, **Save this basket** stores the basket under a name you choose (up to 40 characters; a duplicate name asks before replacing).
- **Restock** (header link) lists saved baskets with the current total at today's prices. Open one to change quantities, remove items, rename or delete it, and **Add selected** or **Add all available** to the cart.
- Items that no longer exist or are out of stock show as unavailable and are never added to the cart. Adding goes through the normal cart, so existing lines are merged, not duplicated.
- Stored in `localStorage` under `homebasket_saved_baskets_v1`: **only the basket name, product IDs and quantities** (never prices or personal details). It stays on this device and browser and does not sync. Corrupt or outdated data is cleaned up safely, with a message if the list had to be reset.
- Config: `SAVED_BASKETS_KEY` and `MAX_SAVED_BASKETS` (default 20) in `config.js`.

### HomeBasket Business Supply (`pages/business-supplies.html`, `assets/js/business.js`)
- The existing business page now also asks for **business category**, **delivery address** and an optional **preferred delivery date**, validates required fields and whole-number quantities (1 to 999), and shows a **Review your request** step before submitting.
- The confirmation screen shows every detail you entered and a **Send on WhatsApp** button. It uses `WHATSAPP_NUMBER` from `config.js`; if that is not set, the button shows a friendly message instead of a broken link.
- Wording on the page: HomeBasket checks availability and confirms the quotation; submitting does **not** contact suppliers; totals are indicative.
- Admin → Quotations shows the new fields. `HB.api.submitBusinessQuoteRequest` accepts the new fields as optional, so older callers still work.

### Reliable Order Updates (`pages/track-order.html`, `assets/js/order-updates.js`, `assets/js/tracking.js`)
- Customers see eight steps: Request Received, Checking Availability, Quotation Ready, Awaiting Customer Approval, Order Confirmed, Preparing Order, Out for Delivery, Delivered, plus a separate **Cancelled / Unavailable** state.
- Each order shows its reference, order date, products and quantities, quoted prices, delivery fee, total payable, current status and a plain update message, plus "Last updated by our team" and a note that status is **not tracked live**.
- Once a quotation is approved, the page shows the approved prices and total as a snapshot. They do not change if catalogue prices change later, and a short note says so.
- Internal supplier-sourcing and delivery statuses are not shown to customers. The mapping from internal statuses to these steps is documented at the top of `order-updates.js`. Internal statuses in `store.js` are unchanged.
- To try every stage with example orders (HB-1001 to HB-1006), set `LOAD_SAMPLE_RECORDS: true` in `config.js`, then open `pages/track-order.html?ref=HB-1004`. Set it back to `false` for a clean store.

### What works only on this device
Saved baskets, orders, quotations and status changes live in this browser. Nothing syncs across devices, and status changes are made by a person in the admin area, not automatically.

### What needs a backend or an integration later
Saved baskets and orders that follow a customer across devices (accounts), real-time or automatic status updates, automatic supplier notifications, and sending quotation requests without the customer pressing Send in WhatsApp.

## Files

```
homebasket/
├── index.html
├── pages/            shop, cart, saved-baskets, checkout, business-supplies, track-order, admin, supplier-portal, delivery-portal
├── assets/
│   ├── css/          styles.css · components.css · dashboard.css
│   ├── js/           config · products · business-data · data-access · store · notifications · app · cart
│   │                 account · home · shop · checkout · tracking · order-updates · saved-baskets · business · admin · suppliers · deliveries
│   └── images/       logo, favicon and icon files
├── README.md
└── .gitignore
```
