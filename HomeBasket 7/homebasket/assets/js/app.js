/* ==========================================================================
   HomeBasket — shared UI utilities (header/footer, modals, badges, WhatsApp,
   product cards). Loaded on every page after store.js.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var CFG = window.HB_CONFIG;
  var ROOT = (document.body && document.body.dataset.root) || "";

  /* ---------- formatting ---------- */
  HB.formatNaira = function (n) { return n === null || n === undefined ? "To be confirmed" : "₦" + Math.round(Number(n) || 0).toLocaleString("en-NG"); };
  HB.escapeHtml = function (s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  HB.formatDateTime = function (iso) {
    try { return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return iso; }
  };
  HB.formatDate = function (iso) {
    try { return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; }
  };
  HB.daysAgo = function (iso) { return Math.floor((Date.now() - Date.parse(iso)) / 86400000); };
  HB.badge = function (text) {
    var t = String(text), c = "badge-neutral";
    if (/^(Delivered|Approved|Accepted|Collected|Supplier reply|Confirmed|Available|In stock|Active|Quoted|Closed|Verified)/i.test(t)) c = "badge-success";
    else if (/(Cancel|Fail|Declin|Reject|Suspend|Unavailable|Returned|Expired|Delayed|Inactive|Unverified)/i.test(t)) c = "badge-danger";
    else if (/(Await|Pending|Draft|New|Low|Review|Integration|not connected|Assigned|Ready)/i.test(t)) c = "badge-warn";
    else if (/(Sourc|Prepar|Packed|Picked|Out for|Queued)/i.test(t)) c = "badge-info";
    return '<span class="badge ' + c + '">' + HB.escapeHtml(t) + "</span>";
  };
  HB.link = function (name) {
    if (name === "home") return ROOT + "index.html";
    return (ROOT === "" ? "pages/" : "") + name + ".html";
  };
  HB.errMsg = function (e) { return (e && e.message) || "Something went wrong. Please try again."; };

  /* ---------- icons ---------- */
  var svg = function (inner) { return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>"; };
  HB.icons = {
    cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    whatsapp: svg('<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.3-1.8-1-.8.7a3.6 3.6 0 0 1-1.5-1.5l.7-.8-1-1.8z"/>'),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>')
  };
  /* HomeBasket logo mark: basket, roof and leaf in the site palette. Colours come from CSS variables so the footer can use a light version. */
  var LOGO = '<svg class="brand-mark" viewBox="440 140 670 540" aria-hidden="true" focusable="false"><path d="M548 364 L770 196 L893 290" fill="none" stroke="var(--logo-roof,#104B34)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><rect x="726" y="290" width="37" height="37" rx="8" fill="var(--logo-roof,#104B34)"/><rect x="776" y="290" width="37" height="37" rx="8" fill="var(--logo-roof,#104B34)"/><rect x="726" y="340" width="37" height="37" rx="8" fill="var(--logo-roof,#104B34)"/><rect x="776" y="340" width="37" height="37" rx="8" fill="var(--logo-roof,#104B34)"/><path d="M930 362 C905 330 898 262 934 222 C975 177 1035 169 1087 167 C1092 232 1078 292 1046 322 C1012 354 968 366 930 362 Z M937 351 L1022 228 L1030 233 L946 356 Z" fill="var(--logo-leaf,#F4C95D)" fill-rule="evenodd"/><rect x="466" y="386" width="148" height="68" rx="34" fill="var(--logo-basket,#176B45)"/><rect x="922" y="386" width="150" height="68" rx="34" fill="var(--logo-basket,#176B45)"/><path d="M512 407 L1024 407 L1024 440 L972 612 Q962 650 908 658 L625 658 Q572 650 560 600 L512 440 Z M626 460 L656 460 Q666 462 668 476 L686 598 Q687 616 666 617 L656 617 Q642 616 640 602 L613 482 Q611 462 626 460 Z M754 460 L782 460 Q794 462 794 476 L790 600 Q789 617 776 617 L762 617 Q746 617 746 602 L741 476 Q741 462 754 460 Z M882 460 L910 460 Q922 462 920 478 L891 602 Q887 617 872 617 L862 617 Q848 616 850 600 L868 476 Q869 462 882 460 Z" fill="var(--logo-basket,#176B45)" fill-rule="evenodd"/></svg>';
  var BRAND_NAME = '<span class="brand-name"><span class="bn-home">Home</span><span class="bn-basket">Basket</span></span>';

  /* ---------- WhatsApp ---------- */
  HB.WA_WARNING = "WhatsApp ordering is being set up. Please try again soon.";
  HB.WA_MESSAGES = {
    general: "Hello HomeBasket, I would like to order everyday essentials.",
    business: "Hello HomeBasket, I would like to request a business quotation.\n\nBusiness name:\nContact person:\nDelivery area:\nItems needed and quantities:\nHow often:",
    contact: "Hello HomeBasket, I have a question."
  };
  HB.whatsappConfigured = function () { return /^\d{10,15}$/.test(String(CFG.WHATSAPP_NUMBER || "")); };
  HB.waLink = function (message) { return "https://wa.me/" + CFG.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message); };
  /* Link to a specific number (digits only). Returns "" if the number is unusable. */
  HB.waLinkTo = function (number, message) {
    var n = String(number || "").replace(/\D/g, "");
    return /^\d{10,15}$/.test(n) ? "https://wa.me/" + n + "?text=" + encodeURIComponent(message) : "";
  };
  /* Opens a prefilled chat. Opening a chat is NOT the same as sending the message. */
  HB.openWhatsApp = function (message) {
    if (!HB.whatsappConfigured()) { HB.toast(HB.WA_WARNING, "error"); return false; }
    var w = window.open(HB.waLink(message), "_blank", "noopener");
    if (!w) window.location.href = HB.waLink(message);
    return true;
  };
  function bindWhatsAppButtons() {
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      var msg = HB.WA_MESSAGES[a.dataset.wa] || HB.WA_MESSAGES.general;
      if (HB.whatsappConfigured()) { a.href = HB.waLink(msg); a.target = "_blank"; a.rel = "noopener"; }
      else a.addEventListener("click", function (e) { e.preventDefault(); HB.toast(HB.WA_WARNING, "error"); });
    });
  }

  /* ---------- toast + modal ---------- */
  HB.toast = function (msg, type) {
    var region = document.getElementById("toast-region");
    if (!region) { region = document.createElement("div"); region.id = "toast-region"; region.setAttribute("aria-live", "polite"); document.body.appendChild(region); }
    var t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " toast-error" : "");
    t.textContent = msg;
    region.appendChild(t);
    var life = type === "error" ? 5500 : 2400;
    setTimeout(function () { t.classList.add("hide"); }, life);
    setTimeout(function () { t.remove(); }, life + 400);
  };
  /* opts: { title, body (html), actions:[{label, cls, onClick(ctrl) -> false keeps open}], wide } */
  HB.modal = function (opts) {
    var dlg = document.createElement("dialog");
    dlg.className = "modal" + (opts.wide ? " modal-wide" : "");
    dlg.innerHTML = '<div class="modal-head"><h2>' + HB.escapeHtml(opts.title || "") + '</h2><button type="button" class="icon-btn" data-close aria-label="Close dialog">' + HB.icons.close + "</button></div>" +
      '<div class="modal-body">' + (opts.body || "") + '</div><div class="modal-foot"></div>';
    var foot = dlg.querySelector(".modal-foot");
    var ctrl = { el: dlg, close: function () { dlg.close(); } };
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn " + (a.cls || "btn-outline"); b.textContent = a.label;
      b.addEventListener("click", function () {
        var r = a.onClick ? a.onClick(ctrl) : undefined;
        if (r && typeof r.then === "function") { b.disabled = true; r.then(function (v) { b.disabled = false; if (v !== false) dlg.close(); }, function () { b.disabled = false; }); }
        else if (r !== false) dlg.close();
      });
      foot.appendChild(b);
    });
    if (!opts.actions || !opts.actions.length) foot.remove();
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("close", function () { dlg.remove(); if (opts.onClose) opts.onClose(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
    dlg.showModal();
    if (opts.onOpen) opts.onOpen(ctrl);
    return ctrl;
  };
  HB.confirm = function (message, o) {
    o = o || {};
    return new Promise(function (resolve) {
      var done = false;
      HB.modal({ title: o.title || "Please confirm", body: "<p>" + message + "</p>",
        actions: [{ label: "Cancel", cls: "btn-outline", onClick: function () { done = true; resolve(false); } },
                  { label: o.confirmLabel || "Confirm", cls: o.danger ? "btn-danger" : "btn-primary", onClick: function () { done = true; resolve(true); } }],
        onClose: function () { if (!done) resolve(false); } });
    });
  };
  /* Run an async service call with consistent feedback. */
  HB.run = function (promise, okMsg) {
    return promise.then(function (r) { if (okMsg) HB.toast(okMsg); return r; }, function (e) { HB.toast(HB.errMsg(e), "error"); throw e; });
  };

  /* ---------- header / footer ---------- */
  var NAV = [["home", "Home", "home"], ["shop", "Shop", "shop"], ["saved-baskets", "Restock", "restock"], ["business-supplies", "Business Supplies", "business"], ["track-order", "Track Order", "track"]];
  function renderCustomerHeader(host) {
    var page = document.body.dataset.page || "";
    var links = NAV.map(function (n) { return '<li><a href="' + HB.link(n[0]) + '"' + (n[2] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a></li>"; }).join("") +
      '<li><a href="' + HB.link("home") + '#contact">Contact</a></li>';
    host.innerHTML = '<div class="announce">Everyday essentials, delivered across selected areas of Anambra State.</div>' +
      '<header class="site-header"><div class="container nav">' +
      '<a class="brand" href="' + HB.link("home") + '" aria-label="HomeBasket home">' + LOGO + BRAND_NAME + '</a>' +
      '<nav id="primary-nav" class="nav-links" aria-label="Primary"><ul>' + links + '</ul><a class="btn btn-primary nav-cta-mobile" href="' + HB.link("shop") + '">Shop Essentials</a></nav>' +
      '<div class="nav-actions"><a class="icon-btn account-link" href="' + (HB.session.current() ? HB.link("my-account") : HB.link("login")) + '" aria-label="' + (HB.session.current() ? "My account" : "Sign in") + '">' + HB.icons.user + '</a><a class="icon-btn cart-link" href="' + HB.link("cart") + '" aria-label="Shopping cart">' + HB.icons.cart + '<span class="cart-count" data-cart-count hidden>0</span></a>' +
      '<a class="btn btn-primary btn-sm nav-cta" href="' + HB.link("shop") + '">Shop Now</a>' +
      '<button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">' + HB.icons.menu + "</button></div></div></header>";
    var nav = document.getElementById("primary-nav"), toggle = document.getElementById("menu-toggle");
    function setMenu(open) {
      nav.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu"); toggle.innerHTML = open ? HB.icons.close : HB.icons.menu;
    }
    toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); toggle.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth >= 900) setMenu(false); });
  }
  function contactBlock() {
    var rows = [CFG.CONTACT_PHONE, CFG.CONTACT_EMAIL, CFG.BUSINESS_HOURS].filter(Boolean);
    return rows.length ? '<div><h2 class="footer-title">Contact</h2><ul class="footer-links plain">' + rows.map(function (r) { return "<li>" + HB.escapeHtml(r) + "</li>"; }).join("") + "</ul></div>" : "";
  }
  function renderFooter(host) {
    host.innerHTML = '<footer class="site-footer"><div class="container footer-grid">' +
      '<div><a class="brand brand-light" href="' + HB.link("home") + '">' + LOGO + BRAND_NAME + '</a><p>' + CFG.TAGLINE + "</p>" +
      '<a class="btn btn-whatsapp" data-wa="general" href="' + HB.link("home") + '#contact">' + HB.icons.whatsapp + " Chat on WhatsApp</a></div>" +
      '<div><h2 class="footer-title">Explore</h2><ul class="footer-links"><li><a href="' + HB.link("shop") + '">Shop</a></li><li><a href="' + HB.link("business-supplies") + '">Business Supplies</a></li>' +
      '<li><a href="' + HB.link("track-order") + '">Track Order</a></li><li><a href="' + HB.link("cart") + '">Your Basket</a></li></ul></div>' +
      contactBlock() +
      '</div><div class="container footer-bottom"><p>© <span id="year"></span> HomeBasket. All rights reserved.</p><p>Prices and availability are confirmed by our team before every order.</p></div></footer>';
    document.getElementById("year").textContent = new Date().getFullYear();
  }
  function renderDashboardHeader(host) {
    var role = document.body.dataset.role || "Admin", page = document.body.dataset.page;
    function a(name, label, key) { return '<a href="' + HB.link(name) + '"' + (page === key ? ' aria-current="page"' : "") + ">" + label + "</a>"; }
    host.innerHTML = '<div class="internal-banner" role="note"><strong>Internal tool</strong> · Records are stored in this browser only · Secure login and a database are not yet enabled</div>' +
      '<header class="dash-top"><div class="container dash-top-inner"><a class="brand" href="' + HB.link("home") + '">' + LOGO + BRAND_NAME + '</a>' +
      '<span class="role-tag">' + HB.escapeHtml(role) + '</span>' +
      '<nav class="dash-links" aria-label="Internal areas">' + a("admin", "Admin", "admin") + a("supplier-portal", "Supplier area", "supplier") + a("delivery-portal", "Delivery area", "delivery") +
      '<a href="' + HB.link("home") + '">Customer site</a></nav>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="reset-records">Reset records</button></div></header>';
    document.getElementById("reset-records").addEventListener("click", function () {
      HB.confirm("Clear all orders, sourcing requests, quotations, deliveries and notifications stored in this browser, and restore the supplier and product data from the data files?", { title: "Reset records", confirmLabel: "Reset", danger: true }).then(function (ok) {
        if (ok) HB.api.resetRecords().then(function () { HB.toast("Records reset."); });
      });
    });
  }

  /* ---------- cart badge ---------- */
  HB.updateCartCount = function () {
    var n = HB.Cart ? HB.Cart.count() : 0;
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n > 99 ? "99+" : n; el.hidden = n === 0; });
    var link = document.querySelector(".cart-link");
    if (link) link.setAttribute("aria-label", "Shopping cart, " + n + (n === 1 ? " item" : " items"));
  };

  /* ---------- images + product cards ---------- */
  HB.placeholderImage = function (emoji, color) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="' + (color || "#E9F5ED") + '"/><text x="200" y="175" font-size="110" text-anchor="middle">' + (emoji || "🛒") + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  };
  HB.imgTag = function (p) {
    var cat = HB.getCategory(p.category) || {};
    var src = CFG.USE_PRODUCT_PHOTOS ? ROOT + p.image : HB.placeholderImage(p.emoji || cat.emoji, cat.color);
    return '<img src="' + src + '" alt="' + HB.escapeHtml(p.name) + '" loading="lazy" width="400" height="300" data-fallback="1" data-emoji="' + HB.escapeHtml(p.emoji || cat.emoji || "🛒") + '" data-color="' + (cat.color || "") + '">';
  };
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.dataset.fallback && !t.dataset.failed) { t.dataset.failed = "1"; t.src = HB.placeholderImage(t.dataset.emoji, t.dataset.color); }
  }, true);

  HB.STOCK = { in_stock: ["In stock", "badge-success"], low_stock: ["Low stock", "badge-warn"], out_of_stock: ["Unavailable", "badge-danger"] };
  HB.stockBadge = function (s) { var x = HB.STOCK[s] || HB.STOCK.in_stock; return '<span class="badge ' + x[1] + '">' + x[0] + "</span>"; };
  function qtyControl(name) {
    return '<div class="qty" role="group" aria-label="Quantity for ' + HB.escapeHtml(name) + '"><button type="button" class="qty-btn" data-qty="dec" aria-label="Decrease quantity">−</button>' +
      '<input class="qty-input" type="number" inputmode="numeric" min="1" max="' + CFG.MAX_QTY + '" value="1" aria-label="Quantity"><button type="button" class="qty-btn" data-qty="inc" aria-label="Increase quantity">+</button></div>';
  }
  HB.productCard = function (p) {
    var cat = HB.getCategory(p.category), oos = p.stock === "out_of_stock";
    return '<article class="product-card' + (oos ? " is-unavailable" : "") + '" data-id="' + p.id + '"><div class="product-media">' + HB.imgTag(p) + "</div>" +
      '<div class="product-body"><p class="product-cat">' + HB.escapeHtml(cat ? cat.name : "") + "</p><h3 class=\"product-name\">" + HB.escapeHtml(p.name) + "</h3>" +
      '<p class="product-unit">' + HB.escapeHtml(p.unit) + "</p><p class=\"product-stock\">" + HB.stockBadge(p.stock) + "</p>" +
      '<p class="product-price">' + HB.formatNaira(p.price) + '</p><div class="product-buy">' + qtyControl(p.name) +
      '<button type="button" class="btn btn-primary add-btn" data-add' + (oos ? " disabled" : "") + ">" + (oos ? "Unavailable" : "Add to Cart") + "</button></div>" +
      '<button type="button" class="link-btn details-btn" data-details>View details</button></div></article>';
  };
  function readQty(scope) {
    var input = scope.querySelector(".qty-input");
    return { input: input, qty: Math.max(1, Math.min(CFG.MAX_QTY, parseInt(input.value, 10) || 1)) };
  }
  function addToCart(id, scope, btn) {
    var q = readQty(scope), p = HB.getProduct(id);
    if (!p || p.stock === "out_of_stock") return;
    HB.Cart.add(id, q.qty);
    q.input.value = 1;
    HB.toast(q.qty + " × " + p.name + " added to your basket");
    if (btn) {
      btn.classList.add("added"); btn.innerHTML = HB.icons.check + " Added";
      setTimeout(function () { btn.classList.remove("added"); btn.textContent = "Add to Cart"; }, 1500);
    }
  }
  HB.showProductDetails = function (id) {
    var p = HB.getProduct(id); if (!p) return;
    var cat = HB.getCategory(p.category), oos = p.stock === "out_of_stock";
    var m = HB.modal({ title: p.name, body: '<div class="detail-grid"><div class="product-media">' + HB.imgTag(p) + '</div><div><p class="product-cat">' + HB.escapeHtml(cat ? cat.name : "") + "</p>" +
      '<p class="muted">' + HB.escapeHtml(p.unit) + '</p><p class="product-price">' + HB.formatNaira(p.price) + "</p><p>" + HB.stockBadge(p.stock) + "</p><p>" + HB.escapeHtml(p.description) + "</p>" +
      '<p class="note">HomeBasket reconfirms price and availability before accepting your order.</p><div class="detail-buy" data-scope>' + qtyControl(p.name) +
      '<button type="button" class="btn btn-primary" data-add' + (oos ? " disabled" : "") + ">" + (oos ? "Unavailable" : "Add to Cart") + "</button></div></div></div>" });
    var scope = m.el.querySelector("[data-scope]");
    scope.addEventListener("click", function (e) {
      var q = e.target.closest("[data-qty]");
      if (q) { var r = readQty(scope); r.input.value = Math.max(1, Math.min(CFG.MAX_QTY, r.qty + (q.dataset.qty === "inc" ? 1 : -1))); return; }
      if (e.target.closest("[data-add]")) { addToCart(id, scope, null); m.close(); }
    });
  };
  HB.bindProductCards = function (container) {
    if (!container) return;
    container.addEventListener("click", function (e) {
      var card = e.target.closest(".product-card"); if (!card) return;
      var q = e.target.closest("[data-qty]");
      if (q) { var r = readQty(card); r.input.value = Math.max(1, Math.min(CFG.MAX_QTY, r.qty + (q.dataset.qty === "inc" ? 1 : -1))); return; }
      var add = e.target.closest("[data-add]");
      if (add) { addToCart(card.dataset.id, card, add); return; }
      if (e.target.closest("[data-details]") || e.target.closest(".product-media")) HB.showProductDetails(card.dataset.id);
    });
    container.addEventListener("change", function (e) {
      if (e.target.classList.contains("qty-input")) e.target.value = Math.max(1, Math.min(CFG.MAX_QTY, parseInt(e.target.value, 10) || 1));
    });
  };

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var hh = document.getElementById("site-header"), ff = document.getElementById("site-footer");
    if (document.body.dataset.layout === "dashboard") { if (hh) renderDashboardHeader(hh); }
    else { if (hh) renderCustomerHeader(hh); if (ff) renderFooter(ff); }
    HB.updateCartCount();
    bindWhatsAppButtons();
  });
  window.addEventListener("hb:cart-change", HB.updateCartCount);
  window.addEventListener("storage", function (e) { if (e.key === CFG.CART_KEY && HB.Cart) { HB.Cart.reload(); HB.updateCartCount(); window.dispatchEvent(new Event("hb:cart-render")); } });
})();
