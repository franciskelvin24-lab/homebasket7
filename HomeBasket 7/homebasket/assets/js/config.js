/* ==========================================================================
   HomeBasket — site configuration ()
   ========================================================================== */
window.HB_CONFIG = {
  /* >>> Replace with the real WhatsApp Business number when you have it.
     International format, DIGITS ONLY: no "+", no spaces, no dashes.
     Example (Nigeria): "2348012345678"                                      */
  WHATSAPP_NUMBER: "2349161595968",   /* HomeBasket WhatsApp Business: 0916 159 5968 */

  BRAND_NAME: "HomeBasket",
  TAGLINE: "Everyday essentials, delivered.",
  SERVICE_REGION: "Anambra State, Nigeria",

  /* Placeholders shown in the footer / contact section — replace before launch */
  /* Leave a value empty ("") to hide that line in the footer. */
  CONTACT_PHONE: "WhatsApp: 0916 159 5968",
  CONTACT_EMAIL: "",
  BUSINESS_HOURS: "",
  ORDER_PREFIX: "HB",

  /* true = load sample orders, quotes and notifications so the internal tools
     (admin / supplier / delivery pages) can be tried. Keep false for a clean store. */
  LOAD_SAMPLE_RECORDS: false,

  /* Storage keys.
     CART_KEY  -> localStorage   (cart only, harmless)
     STATE_KEY -> sessionStorage (orders, requests and deliveries for this browser tab only)
     All storage access goes through assets/js/data-access.js. */
  CART_KEY: "homebasket_cart_v2",
  STATE_KEY: "homebasket_state_v2",
  /* Saved baskets ("Restock My Basket"): product IDs and quantities only, this device only. */
  /* Demonstration accounts (no real sign-in): tab-only storage, never passwords. */
  ACCOUNTS_KEY: "homebasket_accounts_v1",
  SESSION_KEY: "homebasket_account_session_v1",
  SAVED_BASKETS_KEY: "homebasket_saved_baskets_v1",
  MAX_SAVED_BASKETS: 20,

  /* false = built-in illustrated placeholders. true = load photos from products.js paths. */
  USE_PRODUCT_PHOTOS: false,

  MAX_QTY: 99,
  QUOTE_VALID_HOURS: 48,

  /* Supplier messages are only queued in the log until a backend and a provider
     (WhatsApp Business Platform / SMS / email) are connected. */
  NOTIFICATION_MODE: "queue-only"
};
