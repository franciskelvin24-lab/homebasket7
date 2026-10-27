/* ==========================================================================
   HomeBasket — business data (suppliers, delivery partners, delivery areas).
   Kept separate from interface code. EDIT THIS FILE: replace the generic supplier and
   partner names, phone numbers and delivery areas with your real ones.
   Delivery areas below must be confirmed by the owner before launch.
   ========================================================================== */
window.HB_DATA = {
  /* costFactor: indicative supplier cost as a fraction of the selling price */
  suppliers: [
    { id: "sup-1", name: "Supplier A", contact: "Contact A", phone: "0800 000 0001", area: "Service area A",
      categories: ["groceries", "staples"], status: "Approved", channel: "whatsapp", verifiedContact: true, costFactor: 0.80 },
    { id: "sup-2", name: "Supplier B", contact: "Contact B", phone: "0800 000 0002", area: "Service area B",
      categories: ["staples", "beverages", "cleaning"], status: "Approved", channel: "sms", verifiedContact: true, costFactor: 0.83 },
    { id: "sup-3", name: "Supplier C", contact: "Contact C", phone: "0800 000 0003", area: "Service area C",
      categories: ["toiletries", "cleaning", "business"], status: "Approved", channel: "whatsapp", verifiedContact: false, costFactor: 0.79 },
    { id: "sup-4", name: "Supplier D", contact: "Contact D", phone: "0800 000 0004", area: "Service area D",
      categories: ["groceries", "beverages", "business"], status: "Pending Review", channel: "email", verifiedContact: true, costFactor: 0.76 }
  ],

  partners: [
    { id: "dp-1", name: "Delivery Partner 1",   phone: "0800 000 1001", area: "Awka",    available: true },
    { id: "dp-2", name: "Delivery Partner 2",   phone: "0800 000 1002", area: "Onitsha", available: true },
    { id: "dp-3", name: "Delivery Partner 3", phone: "0800 000 1003", area: "Nnewi",   available: false }
  ],

  /* Delivery areas with indicative fees. fee:null = to be confirmed. Edit to match where you really deliver. */
  zones: [
    { id: "z-awka",    name: "Awka",    fee: 1500 },
    { id: "z-onitsha", name: "Onitsha", fee: 2000 },
    { id: "z-nnewi",   name: "Nnewi",   fee: 2500 },
    { id: "z-other",   name: "Other area (we will check if we can serve you)", fee: null }
  ],

  businessQuotes: [
    { businessName: "Sample Guesthouse Ltd", contact: "Sample Manager", phone: "0800 000 2001", area: "Awka", requirements: "Monthly restock of guest-room supplies.",
      frequency: "Monthly", notes: "Sample record", items: [["tissue-bulk", 4], ["guest-50", 2], ["towel-12", 1]], status: "In Review", hoursAgo: 30 },
    { businessName: "Sample Salon & Spa", contact: "Sample Owner", phone: "0800 000 2002", area: "Onitsha", requirements: "Towels, sanitiser and cleaning supplies.",
      frequency: "One-off", notes: "Sample record", items: [["towel-12", 2], ["sanitiser-500", 6]], status: "New", hoursAgo: 5 }
  ],

  /* Sample orders (only loaded when LOAD_SAMPLE_RECORDS is true). stage: received | quote-pending | sourcing | out | delivered | cancelled */
  seedOrders: [
    { stage: "delivered", hoursAgo: 120, zoneId: "z-awka", option: "standard", customer: { name: "Sample Customer A", phone: "0800 000 3001", address: "12 Sample Street, Awka", area: "Awka", instructions: "Call on arrival" },
      lines: [["rice-25kg", 1], ["vegoil-5l", 2], ["sugar-1kg", 3]] },
    { stage: "out", hoursAgo: 40, zoneId: "z-onitsha", option: "standard", customer: { name: "Sample Customer B", phone: "0800 000 3002", address: "5 Sample Road, Onitsha", area: "Onitsha", instructions: "" },
      lines: [["detergent-2k", 2], ["tissue-bulk", 1], ["water-12", 4]] },
    { stage: "sourcing", hoursAgo: 26, zoneId: "z-awka", option: "scheduled", customer: { name: "Sample Customer C", phone: "0800 000 3003", address: "3 Placeholder Close, Awka", area: "Awka", instructions: "Leave with security" },
      lines: [["malt-24", 2], ["beans-5kg", 2], ["liners-30", 3]] },
    { stage: "quote-pending", hoursAgo: 8, zoneId: "z-nnewi", option: "standard", customer: { name: "Sample Customer D", phone: "0800 000 3004", address: "9 Example Avenue, Nnewi", area: "Nnewi", instructions: "" },
      lines: [["eggs-30", 2], ["noodles-40", 1], ["tomato-50", 1]], adjustFirstLinePrice: 300 },
    { stage: "received", hoursAgo: 1, zoneId: "z-awka", option: "standard", customer: { name: "Sample Customer E", phone: "0800 000 3005", address: "21 Test Lane, Awka", area: "Awka", instructions: "" },
      lines: [["cups-100", 2], ["kitchen-6", 2], ["soap-4", 3]] },
    { stage: "cancelled", hoursAgo: 70, zoneId: "z-onitsha", option: "standard", customer: { name: "Sample Customer F", phone: "0800 000 3006", address: "7 Mock Street, Onitsha", area: "Onitsha", instructions: "" },
      lines: [["palmoil-4l", 1], ["garri-5kg", 2]] }
  ]
};
