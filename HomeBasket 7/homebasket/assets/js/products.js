/* ==========================================================================
   HomeBasket — customer-facing product catalogue (ONE selling price each)
   Prices, units and stock values here are working figures: confirm them with your suppliers and edit before launch.
   Supplier names/costs are NOT stored here (see business-data.js + store.js).
   stock: "in_stock" | "low_stock" | "out_of_stock"
   ========================================================================== */
window.HB_CATEGORIES = [
  { id: "groceries",  name: "Groceries",         emoji: "🛒", color: "#F6EFD8", blurb: "Sugar, eggs, noodles, milk" },
  { id: "staples",    name: "Food Staples",      emoji: "🍚", color: "#FBF0D6", blurb: "Rice, beans, garri, oil" },
  { id: "beverages",  name: "Beverages",         emoji: "🥤", color: "#E2EEFB", blurb: "Water, malt, juice, tea" },
  { id: "toiletries", name: "Toiletries",        emoji: "🧼", color: "#E3F0F7", blurb: "Soap, toothpaste, tissue" },
  { id: "cleaning",   name: "Cleaning Supplies", emoji: "🧴", color: "#E4F3E8", blurb: "Detergent, bleach, sanitiser" },
  { id: "business",   name: "Business Supplies", emoji: "🏨", color: "#F1EAF7", blurb: "Hospitality, office and salon" }
];

window.HB_PRODUCTS = [
  /* Groceries */
  { id: "sugar-1kg",   name: "Granulated Sugar",          category: "groceries", unit: "1kg pack",            price: 1900,  emoji: "🍬", stock: "in_stock",     image: "assets/images/sugar.jpg",      description: "White granulated sugar." },
  { id: "milk-400",    name: "Powdered Milk",             category: "groceries", unit: "400g tin",            price: 4800,  emoji: "🥛", stock: "in_stock",     image: "assets/images/milk.jpg",       description: "Full-cream powdered milk." },
  { id: "eggs-30",     name: "Table Eggs",                category: "groceries", unit: "Crate of 30",         price: 4500,  emoji: "🥚", stock: "in_stock",     image: "assets/images/eggs.jpg",       description: "A full crate of table eggs." },
  { id: "seasoning",   name: "Seasoning Cubes",           category: "groceries", unit: "Carton",              price: 9500,  emoji: "🧂", stock: "in_stock",     image: "assets/images/seasoning.jpg",  description: "Carton of seasoning cubes for cooking." },
  { id: "noodles-40",  name: "Instant Noodles",           category: "groceries", unit: "Carton of 40",        price: 9000,  emoji: "🍜", stock: "low_stock",    image: "assets/images/noodles.jpg",    description: "Quick-cook noodles in a carton." },
  { id: "tomato-50",   name: "Tomato Paste",              category: "groceries", unit: "Carton of 50 sachets", price: 10500, emoji: "🍅", stock: "in_stock",    image: "assets/images/tomato.jpg",     description: "Sachet tomato paste for stews." },
  /* Food staples */
  { id: "rice-25kg",   name: "Parboiled Rice",            category: "staples",   unit: "25kg bag",            price: 48000, emoji: "🍚", stock: "in_stock",     image: "assets/images/rice25.jpg",     description: "Long-grain parboiled rice, bag." },
  { id: "rice-10kg",   name: "Parboiled Rice",            category: "staples",   unit: "10kg bag",            price: 20500, emoji: "🍚", stock: "in_stock",     image: "assets/images/rice10.jpg",     description: "Long-grain parboiled rice, smaller bag." },
  { id: "beans-5kg",   name: "Brown Beans",               category: "staples",   unit: "5kg bag",             price: 9500,  emoji: "🫘", stock: "in_stock",     image: "assets/images/beans.jpg",      description: "Clean dried brown beans." },
  { id: "garri-5kg",   name: "Garri",                     category: "staples",   unit: "5kg bag",             price: 5500,  emoji: "🥣", stock: "in_stock",     image: "assets/images/garri.jpg",      description: "Dry-milled cassava garri." },
  { id: "semo-5kg",    name: "Semovita",                  category: "staples",   unit: "5kg bag",             price: 7500,  emoji: "🍲", stock: "in_stock",     image: "assets/images/semo.jpg",       description: "Semolina swallow flour." },
  { id: "yamflour-5kg", name: "Yam Flour",                category: "staples",   unit: "5kg bag",             price: 8000,  emoji: "🍠", stock: "low_stock",    image: "assets/images/yamflour.jpg",   description: "Yam flour (elubo)." },
  { id: "palmoil-4l",  name: "Palm Oil",                  category: "staples",   unit: "4 litre gallon",      price: 12000, emoji: "🫒", stock: "in_stock",     image: "assets/images/palmoil.jpg",    description: "Red palm oil." },
  { id: "vegoil-5l",   name: "Vegetable Cooking Oil",     category: "staples",   unit: "5 litre bottle",      price: 14500, emoji: "🫒", stock: "in_stock",     image: "assets/images/vegoil.jpg",     description: "Refined vegetable oil." },
  { id: "spaghetti-20", name: "Spaghetti",                category: "staples",   unit: "Carton of 20 packs",  price: 17500, emoji: "🍝", stock: "in_stock",     image: "assets/images/spaghetti.jpg",  description: "Dried spaghetti, carton." },
  /* Beverages */
  { id: "water-12",    name: "Bottled Water",             category: "beverages", unit: "Pack of 12 (75cl)",   price: 2600,  emoji: "💧", stock: "in_stock",     image: "assets/images/water.jpg",      description: "Table water in 75cl bottles." },
  { id: "malt-24",     name: "Malt Drink",                category: "beverages", unit: "Carton of 24",        price: 15500, emoji: "🥤", stock: "in_stock",     image: "assets/images/malt.jpg",       description: "Non-alcoholic malt drink." },
  { id: "juice-1l",    name: "Fruit Juice",               category: "beverages", unit: "1 litre pack",        price: 1900,  emoji: "🧃", stock: "in_stock",     image: "assets/images/juice.jpg",      description: "Ready-to-drink fruit juice." },
  { id: "tea-100",     name: "Tea Bags",                  category: "beverages", unit: "Box of 100",          price: 2700,  emoji: "🍵", stock: "in_stock",     image: "assets/images/tea.jpg",        description: "Black tea bags." },
  { id: "cocoa-400",   name: "Cocoa Beverage Powder",     category: "beverages", unit: "400g tin",            price: 3800,  emoji: "☕", stock: "out_of_stock", image: "assets/images/cocoa.jpg",      description: "Chocolate beverage powder." },
  /* Toiletries */
  { id: "soap-4",      name: "Bath Soap",                 category: "toiletries", unit: "Pack of 4",          price: 1900,  emoji: "🧼", stock: "in_stock",     image: "assets/images/soap.jpg",       description: "Gentle everyday bathing soap." },
  { id: "toothpaste",  name: "Toothpaste",                category: "toiletries", unit: "140g tube",          price: 1700,  emoji: "🪥", stock: "in_stock",     image: "assets/images/toothpaste.jpg", description: "Fluoride toothpaste." },
  { id: "tissue-10",   name: "Toilet Tissue",             category: "toiletries", unit: "Pack of 10 rolls",   price: 3400,  emoji: "🧻", stock: "in_stock",     image: "assets/images/tissue.jpg",     description: "Soft toilet tissue rolls." },
  { id: "pads-8",      name: "Sanitary Pads",             category: "toiletries", unit: "Pack of 8",          price: 1300,  emoji: "🌸", stock: "in_stock",     image: "assets/images/pads.jpg",       description: "Absorbent sanitary pads." },
  { id: "lotion-400",  name: "Body Lotion",               category: "toiletries", unit: "400ml bottle",       price: 3300,  emoji: "🧴", stock: "low_stock",    image: "assets/images/lotion.jpg",     description: "Moisturising body lotion." },
  /* Cleaning */
  { id: "detergent-2k", name: "Laundry Detergent",        category: "cleaning",  unit: "2kg pack",            price: 4800,  emoji: "🧺", stock: "in_stock",     image: "assets/images/detergent.jpg",  description: "Powder detergent." },
  { id: "bleach-1l",   name: "Bleach",                    category: "cleaning",  unit: "1 litre bottle",      price: 1600,  emoji: "🪣", stock: "in_stock",     image: "assets/images/bleach.jpg",     description: "Household bleach." },
  { id: "dishwash-750", name: "Dishwashing Liquid",       category: "cleaning",  unit: "750ml bottle",        price: 1900,  emoji: "🍽️", stock: "in_stock",     image: "assets/images/dishwash.jpg",   description: "Grease-cutting dish liquid." },
  { id: "floor-1l",    name: "Floor Cleaner",             category: "cleaning",  unit: "1 litre bottle",      price: 2400,  emoji: "🧹", stock: "in_stock",     image: "assets/images/floor.jpg",      description: "Multi-surface floor cleaner." },
  { id: "sanitiser-500", name: "Hand Sanitiser",          category: "cleaning",  unit: "500ml bottle",        price: 2900,  emoji: "🧴", stock: "in_stock",     image: "assets/images/sanitiser.jpg",  description: "Hand sanitiser." },
  /* Business supplies */
  { id: "a4-ream",     name: "A4 Printing Paper",         category: "business",  unit: "Ream (500 sheets)",   price: 6800,  emoji: "📄", stock: "in_stock",     image: "assets/images/a4.jpg",         description: "White A4 paper." },
  { id: "liners-30",   name: "Bin Liners (Large)",        category: "business",  unit: "Roll of 30",          price: 2800,  emoji: "🗑️", stock: "in_stock",     image: "assets/images/liners.jpg",     description: "Large refuse liners." },
  { id: "cups-100",    name: "Disposable Cups",           category: "business",  unit: "Pack of 100",         price: 3400,  emoji: "🥛", stock: "in_stock",     image: "assets/images/cups.jpg",       description: "Paper cups for water and hot drinks." },
  { id: "kitchen-6",   name: "Kitchen Paper Towels",      category: "business",  unit: "Pack of 6 rolls",     price: 4200,  emoji: "🧻", stock: "in_stock",     image: "assets/images/kitchen.jpg",    description: "Absorbent kitchen towels." },
  { id: "tissue-bulk", name: "Bulk Toilet Tissue",        category: "business",  unit: "Carton of 40 rolls",  price: 11500, emoji: "🧻", stock: "in_stock",     image: "assets/images/tissuebulk.jpg", description: "Carton of toilet tissue for guesthouses and offices." },
  { id: "guest-50",    name: "Guest Toiletry Sets",       category: "business",  unit: "Box of 50 sets",      price: 14500, emoji: "🏨", stock: "low_stock",    image: "assets/images/guestsets.jpg",  description: "Soap and toiletry sets for guest rooms." },
  { id: "towel-12",    name: "Hand Towels",               category: "business",  unit: "Pack of 12",          price: 9800,  emoji: "🧖", stock: "in_stock",     image: "assets/images/towels.jpg",     description: "Cotton hand towels for salons and guesthouses." }
];

/* Home-page "popular" picks. Chosen by us, NOT from sales data. */
window.HB_FEATURED_IDS = ["rice-25kg", "vegoil-5l", "eggs-30", "malt-24", "detergent-2k", "tissue-bulk", "water-12", "noodles-40"];
