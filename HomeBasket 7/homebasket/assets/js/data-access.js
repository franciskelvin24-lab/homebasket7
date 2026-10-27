/* ==========================================================================
   HomeBasket — DATA-ACCESS LAYER
   --------------------------------------------------------------------------
   Every read or write of browser storage in this project happens in THIS file.
   The rest of the site talks to repositories (HB.data.*) that return Promises,
   exactly as a real backend client would.

   Prototype today:                         Later, with a backend:
     HB.storage  -> localStorage/session      replace the repository bodies with
     HB.data.*   -> read/write HB.storage     fetch() calls to your API. The
                                              pages, forms and UI code do not change.

   Scopes: "local" = this browser, kept until cleared; "session" = this browser
   tab only. Never put passwords, payment details or secrets in either.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var CFG = window.HB_CONFIG;
  var memory = { local: {}, session: {} };

  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function area(scope) {
    try { return (scope === "session" ? window.sessionStorage : window.localStorage) || null; } catch (e) { return null; }
  }
  function nowIso() { return new Date().toISOString(); }
  function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fail(msg, code) { var e = new Error(msg); e.code = code || "invalid"; throw e; }
  /* Wrap a synchronous prototype operation so callers use the same Promise API a backend client would. */
  function P(fn) { return function () { var a = arguments; return new Promise(function (res, rej) { try { res(fn.apply(null, a)); } catch (e) { rej(e); } }); }; }

  /* ---------- storage adapter (the ONLY place storage APIs are touched) ---------- */
  HB.storage = {
    /* -> { value, corrupt }. value is null when nothing is stored. */
    read: function (scope, key) {
      var a = area(scope);
      if (!a) return { value: memory[scope][key] === undefined ? null : clone(memory[scope][key]), corrupt: false };
      var raw = null;
      try { raw = a.getItem(key); } catch (e) { return { value: null, corrupt: false }; }
      if (raw === null || raw === undefined) return { value: null, corrupt: false };
      try { return { value: JSON.parse(raw), corrupt: false }; } catch (e) { return { value: null, corrupt: true }; }
    },
    /* -> true when persisted, false when the browser blocked storage (value then lives in memory only) */
    write: function (scope, key, value) {
      memory[scope][key] = clone(value);
      var a = area(scope); if (!a) return false;
      try { a.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (scope, key) {
      delete memory[scope][key];
      var a = area(scope); try { if (a) a.removeItem(key); } catch (e) {}
    }
  };

  /* ==========================================================================
     CUSTOMERS (demonstration accounts)
     There is NO real authentication here. A signed-in state is a marker kept
     in this browser tab. Passwords are validated for format and then DISCARDED:
     they are never stored, hashed or checked. Real sign-in needs a backend.
     ========================================================================== */
  var ACCOUNTS_KEY = CFG.ACCOUNTS_KEY || "homebasket_accounts_v1";
  var SESSION_KEY = CFG.SESSION_KEY || "homebasket_account_session_v1";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function readAccounts() {
    var r = HB.storage.read("session", ACCOUNTS_KEY);
    return (Array.isArray(r.value) ? r.value : []).filter(function (a) { return a && typeof a.id === "string" && typeof a.email === "string"; });
  }
  function writeAccounts(list) { return HB.storage.write("session", ACCOUNTS_KEY, list); }
  function publicProfile(a) { return a ? { id: a.id, name: a.name, email: a.email, phone: a.phone || "", createdAt: a.createdAt } : null; }
  function findByEmail(list, email) { var e = String(email || "").trim().toLowerCase(); return list.filter(function (a) { return a.email === e; })[0] || null; }
  function validateName(n) { n = String(n || "").trim(); if (n.length < 2 || n.length > 60) fail("Enter your full name (2 to 60 characters).", "name"); return n; }
  function validateEmail(e) { e = String(e || "").trim().toLowerCase(); if (!EMAIL_RE.test(e)) fail("Enter a valid email address.", "email"); return e; }
  function validatePhone(p) {
    p = String(p || "").trim(); if (!p) return "";
    var n = HB.normalizeNgPhone(p); if (!n) fail("Enter a valid Nigerian phone number, e.g. 0803 123 4567.", "phone"); return n;
  }

  /* Synchronous read used by page chrome (header link, form prefill). */
  HB.session = {
    current: function () {
      var s = HB.storage.read("session", SESSION_KEY).value, id = s && s.customerId;
      if (!id) return null;
      return publicProfile(readAccounts().filter(function (a) { return a.id === id; })[0]);
    },
    currentId: function () { var c = this.current(); return c ? c.id : null; }
  };

  var customers = {
    createAccount: P(function (input) {
      input = input || {};
      var name = validateName(input.name), email = validateEmail(input.email), phone = validatePhone(input.phone);
      var password = String(input.password || "");
      if (password.length < 8) fail("Use a password of at least 8 characters.", "password");
      if (input.confirmPassword !== undefined && input.confirmPassword !== password) fail("The two passwords do not match.", "confirmPassword");
      var list = readAccounts();
      if (findByEmail(list, email)) fail("An account with that email already exists here. Try signing in.", "email");
      /* The password is deliberately not kept: nothing below stores or hashes it. */
      var acc = { id: newId("cus-"), name: name, email: email, phone: phone, createdAt: nowIso() };
      list.push(acc); writeAccounts(list);
      HB.storage.write("session", SESSION_KEY, { customerId: acc.id, at: nowIso() });
      return { customer: publicProfile(acc), simulated: true };
    }),
    signIn: P(function (input) {
      input = input || {};
      var email = validateEmail(input.email);
      if (!String(input.password || "")) fail("Enter your password.", "password");
      var acc = findByEmail(readAccounts(), email);
      if (!acc) fail("No account with that email exists in this browser. Create an account first.", "email");
      /* Demonstration only: the password is NOT verified. */
      HB.storage.write("session", SESSION_KEY, { customerId: acc.id, at: nowIso() });
      return { customer: publicProfile(acc), simulated: true, verified: false };
    }),
    signOut: P(function () { HB.storage.remove("session", SESSION_KEY); return true; }),
    getCurrent: P(function () { return HB.session.current(); }),
    updateProfile: P(function (input) {
      var id = HB.session.currentId(); if (!id) fail("Sign in first.", "auth");
      var name = validateName(input.name), phone = validatePhone(input.phone), list = readAccounts();
      list.forEach(function (a) { if (a.id === id) { a.name = name; a.phone = phone; } });
      writeAccounts(list); return HB.session.current();
    }),
    /* Nothing is emailed. Always answers the same way so it never reveals which emails have accounts. */
    requestPasswordReset: P(function (email) {
      validateEmail(email);
      return { simulated: true, sent: false };
    }),
    deleteAccount: P(function () {
      var id = HB.session.currentId(); if (!id) fail("Sign in first.", "auth");
      writeAccounts(readAccounts().filter(function (a) { return a.id !== id; }));
      HB.storage.remove("session", SESSION_KEY);
      removeOwnerBaskets(id);
      return true;
    })
  };

  /* ==========================================================================
     SAVED BASKETS ("Restock My Basket")
     Stores only: owner id, basket name, product IDs and quantities. Never prices.
     { id, ownerId, name, createdAt, updatedAt, items:[{ id, qty }] }
     ownerId is a customer id, or "guest" when nobody is signed in.
     ========================================================================== */
  var BASKETS_KEY = CFG.SAVED_BASKETS_KEY || "homebasket_saved_baskets_v1";
  var MAXQ = CFG.MAX_QTY || 99, LIMIT = CFG.MAX_SAVED_BASKETS || 20, NAME_MAX = 40;

  function cleanItems(raw) {
    var idx = {}, out = [];
    (Array.isArray(raw) ? raw : []).slice(0, 200).forEach(function (i) {
      if (!i || typeof i.id !== "string" || !i.id) return;
      var q = Math.floor(Number(i.qty)); if (!isFinite(q) || q < 1) return; q = Math.min(q, MAXQ);
      if (idx[i.id] !== undefined) out[idx[i.id]].qty = Math.min(MAXQ, out[idx[i.id]].qty + q); else { idx[i.id] = out.length; out.push({ id: i.id, qty: q }); }
    });
    return out;
  }
  function cleanBaskets(raw) {
    var seen = {}, out = [];
    raw.slice(0, LIMIT * 20).forEach(function (b) {
      if (!b || typeof b !== "object") return;
      var name = typeof b.name === "string" ? b.name.trim().slice(0, NAME_MAX) : ""; if (!name) return;
      var id = typeof b.id === "string" && b.id && !seen[b.id] ? b.id : newId("b"); seen[id] = true;
      out.push({ id: id, ownerId: typeof b.ownerId === "string" && b.ownerId ? b.ownerId : "guest", name: name,
        createdAt: typeof b.createdAt === "string" ? b.createdAt : nowIso(), updatedAt: typeof b.updatedAt === "string" ? b.updatedAt : nowIso(), items: cleanItems(b.items) });
    });
    return out;
  }
  function loadAll() {
    var r = HB.storage.read("local", BASKETS_KEY);
    if (r.corrupt || (r.value !== null && !Array.isArray(r.value))) return { all: [], corrupt: true };
    return { all: r.value === null ? [] : cleanBaskets(r.value), corrupt: false };
  }
  function saveAll(all) { return HB.storage.write("local", BASKETS_KEY, all); }
  function owner() { return HB.session.currentId() || "guest"; }
  function nameProblem(name) { var n = String(name || "").trim(); return !n ? "Give your basket a name." : (n.length > NAME_MAX ? "Use " + NAME_MAX + " characters or fewer." : ""); }
  function sameName(list, name, exceptId) { var n = name.trim().toLowerCase(); return list.filter(function (b) { return b.id !== exceptId && b.name.toLowerCase() === n; })[0] || null; }
  function mine(all) { var o = owner(); return all.filter(function (b) { return b.ownerId === o; }); }
  function removeOwnerBaskets(ownerId) { var s = loadAll(); saveAll(s.all.filter(function (b) { return b.ownerId !== ownerId; })); }
  var STORAGE_BLOCKED = "Your browser is blocking storage, so this could not be saved.";

  var savedBaskets = {
    /* -> { baskets:[...], corrupt:boolean } for the current owner */
    list: P(function () { var s = loadAll(); return { baskets: mine(s.all), corrupt: s.corrupt }; }),
    get: P(function (id) { return mine(loadAll().all).filter(function (b) { return b.id === id; })[0] || null; }),
    /* Create a basket from items [{id, qty}]. Resolves { ok, error?, exists?, basket? } (never rejects for validation). */
    save: P(function (input) {
      var err = nameProblem(input.name); if (err) return { ok: false, error: err };
      var items = cleanItems(input.items); if (!items.length) return { ok: false, error: "There is nothing to save." };
      var s = loadAll(), list = mine(s.all), dup = sameName(list, input.name, null);
      if (dup && !input.overwrite) return { ok: false, exists: true, error: "You already have a basket called “" + dup.name + "”." };
      if (dup) { dup.items = items; dup.updatedAt = nowIso(); }
      else {
        if (list.length >= LIMIT) return { ok: false, error: "You can save up to " + LIMIT + " baskets. Delete one first." };
        dup = { id: newId("b"), ownerId: owner(), name: input.name.trim(), createdAt: nowIso(), updatedAt: nowIso(), items: items }; s.all.unshift(dup);
      }
      return saveAll(s.all) ? { ok: true, basket: dup } : { ok: false, error: STORAGE_BLOCKED };
    }),
    rename: P(function (id, name) {
      var err = nameProblem(name); if (err) return { ok: false, error: err };
      var s = loadAll(), list = mine(s.all), b = list.filter(function (x) { return x.id === id; })[0];
      if (!b) return { ok: false, error: "That basket no longer exists." };
      if (sameName(list, name, id)) return { ok: false, error: "You already have a basket with that name." };
      b.name = name.trim(); b.updatedAt = nowIso();
      return saveAll(s.all) ? { ok: true } : { ok: false, error: STORAGE_BLOCKED };
    }),
    remove: P(function (id) { var o = owner(), s = loadAll(); return saveAll(s.all.filter(function (b) { return !(b.id === id && b.ownerId === o); })); }),
    setQty: P(function (id, productId, qty) {
      var s = loadAll(), b = mine(s.all).filter(function (x) { return x.id === id; })[0]; if (!b) return false;
      var q = Math.floor(Number(qty)); if (!isFinite(q) || q < 1) q = 1; q = Math.min(q, MAXQ);
      b.items.forEach(function (i) { if (i.id === productId) i.qty = q; }); b.updatedAt = nowIso(); return saveAll(s.all);
    }),
    removeItem: P(function (id, productId) {
      var s = loadAll(), b = mine(s.all).filter(function (x) { return x.id === id; })[0]; if (!b) return false;
      b.items = b.items.filter(function (i) { return i.id !== productId; }); b.updatedAt = nowIso(); return saveAll(s.all);
    })
  };

  /* ==========================================================================
     PRODUCTS, QUOTATIONS, ORDERS
     Thin, customer-facing repositories over the service layer in store.js
     (HB.api). With a backend, point these at your API instead.
     ========================================================================== */
  var products = {
    list: function (opts) { return HB.api.getProducts(opts); },
    get: function (id) { return HB.api.getProducts({ includeInactive: true }).then(function (l) { return l.filter(function (p) { return p.id === id; })[0] || null; }); }
  };
  var quotations = {
    submitBusinessRequest: function (payload) { return HB.api.submitBusinessQuoteRequest(payload); },
    recordCustomerDecision: function (quotationId, decision) { return HB.api.recordCustomerQuotationApproval(quotationId, decision); }
  };
  var orders = {
    /* Attaches the signed-in customer id (if any) so My Account can list the order. */
    create: function (payload) {
      payload = payload || {}; var p = {}; Object.keys(payload).forEach(function (k) { p[k] = payload[k]; });
      if (!p.customerId) p.customerId = HB.session.currentId() || null;
      return HB.api.createOrder(p);
    },
    /* Customer-safe view only: no supplier or cost data. */
    getByReference: function (ref) { return HB.api.getOrderByReference(ref, { audience: "customer" }); },
    listForCustomer: function (customerId) { return HB.api.getCustomerOrders(customerId); }
  };

  var zones = { list: function () { return HB.api.getZones(); } };

  HB.data = { mode: "prototype", customers: customers, savedBaskets: savedBaskets, products: products, quotations: quotations, orders: orders, zones: zones };
})();
