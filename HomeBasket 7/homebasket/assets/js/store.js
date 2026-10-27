/* ==========================================================================
   HomeBasket — LOCAL STORE + BACKEND-READY SERVICE LAYER
   --------------------------------------------------------------------------
   * All data lives in one state object (business data from business-data.js).
   * The state is persisted to sessionStorage so it survives page navigation
     inside the same browser tab. It is NOT shared across devices or tabs.
   * UI code should only call HB.api.* (Promises). To go live, replace the
     bodies of these functions with fetch() calls to a real backend.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var CFG = window.HB_CONFIG, D = window.HB_DATA;
  var S = null;            // state
  var T = null;            // time override used only while seeding
  var core = (HB._core = {});

  HB.ORDER_STAGES = ["Order Received", "Awaiting Availability/Price Confirmation", "Confirmed", "Sourcing", "Packed", "Out for Delivery", "Delivered"];
  HB.DELIVERY_STATUSES = ["Awaiting Assignment", "Assigned", "Ready for Pickup", "Picked Up", "Out for Delivery", "Delivered", "Failed Delivery", "Returned"];
  HB.SR_STATUSES = ["New Request", "Accepted", "Preparing", "Ready for Collection", "Collected", "Declined"];
  HB.QUOTE_STATUSES = ["Draft", "Awaiting Customer Approval", "Approved", "Rejected", "Expired"];
  HB.SUPPLIER_STATUSES = ["Pending Review", "Approved", "Suspended"];
  HB.BUSINESS_CATEGORIES = ["Hotel", "Guesthouse", "Restaurant", "Salon", "Office", "Shop", "Other"];
  HB.BQ_STATUSES = ["New", "In Review", "Quoted", "Closed"];

  /* ---------- helpers ---------- */
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function stamp() { return new Date(T !== null ? T : Date.now()).toISOString(); }
  function tick(min) { if (T !== null) T = Math.min(Date.now(), T + min * 60000); }
  function fail(m) { throw new Error(m); }
  function nextId(k) { S.counters[k] += 1; return S.counters[k]; }
  function byId(arr, id, key) { key = key || "id"; for (var i = 0; i < arr.length; i++) if (arr[i][key] === id) return arr[i]; return null; }
  function dateStr(daysAhead) { var d = new Date(Date.now() + daysAhead * 86400000); return d.toISOString().slice(0, 10); }
  function sum(arr, fn) { return arr.reduce(function (s, x) { return s + fn(x); }, 0); }
  function stageIdx(s) { return HB.ORDER_STAGES.indexOf(s); }
  function has(arr, v) { return arr.indexOf(v) > -1; }

  HB.normalizeNgPhone = function (raw) {
    var s = String(raw || "").replace(/[\s\-().]/g, "");
    var m = /^(?:\+?234|0)([789][01]\d{8})$/.exec(s);
    return m ? "+234" + m[1] : null;
  };

  /* ---------- state lifecycle ---------- */
  function persist() { HB.storage.write("session", CFG.STATE_KEY, S); }
  function save() { persist(); window.dispatchEvent(new Event("hb:state-change")); }
  function ensure() {
    if (S) return S;
    var loaded = null;
    var saved = HB.storage.read("session", CFG.STATE_KEY).value; if (saved && saved.v === 2) loaded = saved;
    if (loaded) S = loaded; else { seed(); persist(); }
    return S;
  }
  function sweepQuotes() {
    S.quotations.forEach(function (q) {
      if (q.status === "Awaiting Customer Approval" && Date.parse(q.expiresAt) < Date.now()) {
        q.status = "Expired"; q.updatedAt = stamp();
        q.history.push({ status: "Expired", at: stamp(), note: "Validity period ended" });
      }
    });
  }
  /* Sync read helpers used by customer UI (cart, product cards) */
  HB.getProduct = function (id) { return byId(ensure().products, id); };
  HB.activeProducts = function () { return ensure().products.filter(function (p) { return p.active; }); };
  HB.getCategory = function (id) { return byId(window.HB_CATEGORIES, id); };

  /* ---------- timeline ---------- */
  function tl(order, status, note, source) {
    order.timeline.push({ at: stamp(), status: status, note: note || "", source: source || "order" });
    order.updatedAt = stamp();
  }
  function setOrderStatus(order, status, note, source) { order.status = status; tl(order, status, note, source || "order"); }

  /* ---------- supplier helpers ---------- */
  function supplierName(id) { var s = byId(S.suppliers, id); return s ? s.name : id; }
  function costOf(supplierId, productId) {
    for (var i = 0; i < S.supplierProducts.length; i++) { var sp = S.supplierProducts[i]; if (sp.supplierId === supplierId && sp.productId === productId) return sp.cost; }
    return null;
  }

  /* ---------- notifications (queue only) ---------- */
  function buildSupplierMessage(sr) {
    var lines = sr.lines.map(function (l) { return "- " + l.qty + " x " + l.name + " (" + l.unit + ")"; }).join("\n");
    return "[NOT SENT] HomeBasket sourcing request " + sr.ref + "\nRequested fulfilment date: " + sr.requestedDate + "\nItems:\n" + lines +
      "\nPlease reply to accept or decline and confirm your price and stock. This message was queued only and has not been sent.";
  }
  function notify(sr) {
    var sup = byId(S.suppliers, sr.supplierId), status, note;
    if (!sup) { status = "Failed"; note = "Supplier record not found."; }
    else if (sup.status === "Suspended") { status = "Failed"; note = "Supplier is suspended. Use the manual fallback."; }
    else if (!sup.verifiedContact) { status = "Failed"; note = "Supplier contact is not verified. Verify it, retry, or contact manually."; }
    else if (sup.channel === "email") { status = "Awaiting Integration"; note = "Email provider is not connected yet."; }
    else { status = "Queued"; note = "Queued for " + sup.channel + ". Not sent: messaging is not yet connected."; }
    var attempts = S.notifications.filter(function (n) { return n.srRef === sr.ref && n.direction === "outbound"; }).length;
    var n = { id: "N-" + nextId("notif"), direction: "outbound", srRef: sr.ref, supplierId: sr.supplierId, channel: sup ? sup.channel : "-",
      at: stamp(), status: status, note: note, attempt: attempts + 1, message: buildSupplierMessage(sr) };
    S.notifications.unshift(n);
    sr.notificationStatus = status;
    return n;
  }

  /* ---------- sourcing ---------- */
  function createSR(order, supplierId, lineList) {
    var sr = { ref: "SR-" + nextId("sr"), orderRef: order.ref, supplierId: supplierId, createdAt: stamp(), updatedAt: stamp(),
      requestedDate: order.scheduledDate || dateStr(1), status: "New Request", notificationStatus: null, response: null,
      lines: lineList.map(function (l) { return { productId: l.productId, name: l.name, unit: l.unit, qty: l.qty, indicativeCost: costOf(supplierId, l.productId) }; }),
      history: [{ status: "New Request", at: stamp() }] };
    S.sourcing.unshift(sr);
    order.sourcingIds.push(sr.ref);
    tl(order, "Sourcing request created", sr.ref + " created for " + supplierName(supplierId) + " (" + lineList.length + " item(s)).", "sourcing");
    notify(sr);
    return sr;
  }
  function routeOrder(order) {
    var groups = {}, un = [];
    order.lines.forEach(function (l) {
      var sid = S.preferred[l.productId];
      if (!sid) { un.push(l.name); return; }
      (groups[sid] = groups[sid] || []).push(l);
    });
    Object.keys(groups).forEach(function (sid) { createSR(order, sid, groups[sid]); });
    if (un.length) tl(order, "Unassigned items", "No supplier selected for: " + un.join(", ") + ".", "sourcing");
  }
  function srUpdate(sr, patch) {
    var order = byId(S.orders, sr.orderRef, "ref");
    var next = { "New Request": ["Accepted", "Declined"], "Accepted": ["Preparing", "Declined"], "Preparing": ["Ready for Collection"], "Ready for Collection": ["Collected"] };
    if (patch.status && patch.status !== sr.status && !has(next[sr.status] || [], patch.status)) fail("A request that is " + sr.status + " cannot move to " + patch.status + ".");
    if (patch.response) {
      var r = patch.response;
      var lines = (r.lines || []).map(function (l) {
        var q = Number(l.proposedQty), c = Number(l.proposedUnitCost);
        if (!(q >= 0) || !(c >= 0)) fail("Proposed quantity and price must be zero or more.");
        return { productId: l.productId, proposedQty: q, proposedUnitCost: c };
      });
      sr.response = { decision: patch.status === "Declined" ? "declined" : "accepted", lines: lines, note: String(r.note || "").slice(0, 300), at: stamp() };
    }
    if (patch.status && patch.status !== sr.status) {
      sr.status = patch.status;
      sr.history.push({ status: patch.status, at: stamp(), note: patch.note || "" });
      if (patch.status === "Accepted" || patch.status === "Declined") {
        var sup = byId(S.suppliers, sr.supplierId);
        S.notifications.unshift({ id: "N-" + nextId("notif"), direction: "inbound", srRef: sr.ref, supplierId: sr.supplierId, channel: sup ? sup.channel : "-", at: stamp(),
          status: "Supplier reply", note: "Supplier " + patch.status.toLowerCase() + " the request.", attempt: 0,
          message: sr.response ? (sr.response.note || "(no note)") : "(no note)" });
      }
      tl(order, "Supplier response", sr.ref + " is now: " + patch.status + ".", "sourcing");
    }
    sr.updatedAt = stamp();
    return sr;
  }

  /* ---------- deliveries ---------- */
  function createDelivery(order) {
    var z = byId(S.zones, order.zoneId);
    var d = { id: "D-" + nextId("delivery"), orderRef: order.ref, zoneId: order.zoneId, area: order.customer.area, partnerId: null, accepted: false,
      option: order.deliveryOption, scheduledDate: order.scheduledDate || null, estFee: z ? z.fee : null, actualCost: null, status: "Awaiting Assignment",
      cancelled: false, notes: [], pod: null, createdAt: stamp(), updatedAt: stamp(), history: [{ status: "Awaiting Assignment", at: stamp() }] };
    S.deliveries.unshift(d);
    order.deliveryId = d.id;
    return d;
  }
  function deliveryAssign(d, partnerId) {
    var order = byId(S.orders, d.orderRef, "ref");
    if (order.status === "Cancelled") fail("This order is cancelled.");
    if (has(["Delivered", "Returned"], d.status)) fail("This delivery is already closed.");
    if (partnerId) {
      if (!byId(S.partners, partnerId)) fail("Unknown delivery partner.");
      d.partnerId = partnerId; d.accepted = false;
      if (d.status === "Awaiting Assignment") { d.status = "Assigned"; d.history.push({ status: "Assigned", at: stamp() }); }
      tl(order, "Delivery partner assigned", "A delivery partner has been assigned to your order.", "delivery");
    } else {
      d.partnerId = null; d.accepted = false; d.status = "Awaiting Assignment";
      d.history.push({ status: "Awaiting Assignment", at: stamp(), note: "Partner unassigned" });
    }
    d.updatedAt = stamp();
    return d;
  }
  function deliverySet(d, status, note) {
    if (!has(HB.DELIVERY_STATUSES, status)) fail("Unknown delivery status.");
    var order = byId(S.orders, d.orderRef, "ref");
    if (order.status === "Cancelled") fail("This order is cancelled.");
    if (status !== "Awaiting Assignment" && !d.partnerId) fail("Assign a delivery partner first.");
    if (has(["Picked Up", "Out for Delivery", "Delivered"], status) && stageIdx(order.status) < stageIdx("Confirmed")) fail("The order must be confirmed before delivery can start.");
    d.status = status; d.updatedAt = stamp();
    d.history.push({ status: status, at: stamp(), note: note || "" });
    if (note) d.notes.push({ at: stamp(), text: String(note).slice(0, 300) });
    if (status === "Out for Delivery") { if (stageIdx(order.status) < stageIdx("Out for Delivery")) setOrderStatus(order, "Out for Delivery", "Your order is out for delivery.", "delivery"); }
    else if (status === "Delivered") { d.deliveredAt = stamp(); order.delayed = false; setOrderStatus(order, "Delivered", "Marked as delivered.", "delivery"); }
    else if (status === "Picked Up") tl(order, "Picked up for delivery", "", "delivery");
    else if (status === "Ready for Pickup") tl(order, "Ready for pickup by delivery partner", "", "delivery");
    else if (status === "Failed Delivery" || status === "Returned") {
      order.delayed = true; order.delayNote = "A delivery attempt was unsuccessful. HomeBasket will contact you.";
      tl(order, "Delivery issue", order.delayNote, "delivery");
    }
    return d;
  }

  /* ---------- orders ---------- */
  function createOrderInternal(p) {
    var c = p.customer || {};
    if (!p.sample) {
      if (String(c.name || "").trim().length < 2) fail("Customer name is required.");
      if (!HB.normalizeNgPhone(c.phone)) fail("A valid Nigerian phone number is required.");
      if (String(c.address || "").trim().length < 8) fail("A full delivery address is required.");
    }
    if (!p.lines || !p.lines.length) fail("The order has no items.");
    var zone = byId(S.zones, p.zoneId);
    if (!zone) fail("Please choose a delivery area.");
    var option = p.deliveryOption === "scheduled" ? "scheduled" : "standard";
    if (option === "scheduled" && !p.sample && !(p.scheduledDate >= dateStr(0))) fail("Choose a delivery date that is today or later.");
    var lines = p.lines.map(function (l) {
      var pr = byId(S.products, l.productId);
      var qty = Math.floor(Number(l.qty));
      if (!pr || !pr.active) fail("A product in your basket is no longer available.");
      if (!(qty >= 1 && qty <= CFG.MAX_QTY)) fail("Quantity must be between 1 and " + CFG.MAX_QTY + ".");
      if (pr.stock === "out_of_stock") fail(pr.name + " is currently unavailable .");
      return { productId: pr.id, name: pr.name, unit: pr.unit, qty: qty, unitPrice: pr.price };
    });
    var subtotal = sum(lines, function (l) { return l.qty * l.unitPrice; });
    var order = { ref: CFG.ORDER_PREFIX + "-" + nextId("order"), createdAt: stamp(), updatedAt: stamp(), sample: !!p.sample, customerId: typeof p.customerId === "string" ? p.customerId : null,
      customer: { name: String(c.name).trim(), phone: p.sample ? c.phone : HB.normalizeNgPhone(c.phone), address: String(c.address).trim(), area: zone.name, instructions: String(c.instructions || "").trim().slice(0, 300) },
      zoneId: zone.id, deliveryOption: option, scheduledDate: option === "scheduled" ? (p.scheduledDate || dateStr(1)) : "",
      lines: lines, subtotalEst: subtotal, deliveryFeeEst: zone.fee, totalEst: subtotal + (zone.fee || 0),
      paymentStatus: "Payment pending", status: "Order Received", delayed: false, delayNote: "", confirmedTotal: null,
      timeline: [], sourcingIds: [], quotationId: null, deliveryId: null };
    tl(order, "Order Received", "Order request received.", "order");
    setOrderStatus(order, "Awaiting Availability/Price Confirmation", "HomeBasket will confirm availability and prices before accepting your order.", "order");
    S.orders.unshift(order);
    routeOrder(order);
    createDelivery(order);
    return order;
  }
  function cancelOrder(order, note) {
    if (order.status === "Delivered") fail("A delivered order cannot be cancelled.");
    setOrderStatus(order, "Cancelled", note || "Order cancelled.", "order");
    var d = byId(S.deliveries, order.deliveryId);
    if (d) { d.cancelled = true; d.updatedAt = stamp(); d.notes.push({ at: stamp(), text: "Order cancelled: delivery no longer needed." }); }
  }
  function customerView(o) {
    var q = o.quotationId ? byId(S.quotations, o.quotationId) : null;
    var d = o.deliveryId ? byId(S.deliveries, o.deliveryId) : null;
    return { ref: o.ref, sample: !!o.sample, createdAt: o.createdAt, status: o.status, delayed: o.delayed, delayNote: o.delayNote,
      customer: { name: o.customer.name, area: o.customer.area, address: o.customer.address },
      deliveryOption: o.deliveryOption, scheduledDate: o.scheduledDate, lines: o.lines, subtotalEst: o.subtotalEst, deliveryFeeEst: o.deliveryFeeEst,
      totalEst: o.totalEst, confirmedTotal: o.confirmedTotal, paymentStatus: o.paymentStatus,
      timeline: o.timeline.filter(function (e) { return e.source === "order" || e.source === "delivery" || e.source === "quotation"; }).map(function (e) { return { at: e.at, status: e.status, note: e.note }; }),
      quotation: (q && q.status !== "Draft") ? { id: q.id, status: q.status, lines: q.lines, deliveryFee: q.deliveryFee, subtotal: q.subtotal, total: q.total, originalTotal: q.originalTotal, expiresAt: q.expiresAt, requiresApproval: q.requiresApproval } : null,
      delivery: d ? { status: d.cancelled ? "Cancelled" : d.status, estFee: d.estFee } : null };
  }

  /* ---------- quotations ---------- */
  function lineSig(lines) { return lines.map(function (l) { return l.productId + ":" + l.qty + ":" + l.unitPrice; }).join("|"); }
  function quoteCreate(order, o) {
    o = o || {};
    if (order.status === "Cancelled" || order.status === "Delivered") fail("This order is closed.");
    var src = o.lines && o.lines.length ? o.lines : order.lines;
    var lines = src.map(function (l) {
      var base = byId(order.lines, l.productId, "productId");
      if (!base) fail("Unknown product in quotation.");
      var qty = Math.floor(Number(l.qty)), price = Number(l.unitPrice != null ? l.unitPrice : base.unitPrice);
      if (!(qty >= 1)) fail("Quantity must be at least 1.");
      if (!(price >= 0)) fail("Price must be zero or more.");
      return { productId: l.productId, name: base.name, unit: base.unit, qty: qty, unitPrice: price, note: String(l.note || "").slice(0, 120) };
    });
    if (!lines.length) fail("A quotation needs at least one item.");
    var fee = (o.deliveryFee !== undefined && o.deliveryFee !== null && o.deliveryFee !== "") ? Number(o.deliveryFee) : (order.deliveryFeeEst || 0);
    if (!(fee >= 0)) fail("Delivery fee must be zero or more.");
    S.quotations.forEach(function (q) {
      if (q.orderRef === order.ref && (q.status === "Draft" || q.status === "Awaiting Customer Approval")) {
        q.status = "Expired"; q.updatedAt = stamp(); q.history.push({ status: "Expired", at: stamp(), note: "Superseded by a newer quotation" });
      }
    });
    var subtotal = sum(lines, function (l) { return l.qty * l.unitPrice; });
    var base0 = (T !== null ? T : Date.now());
    var q = { id: "Q-" + nextId("quote"), orderRef: order.ref, status: "Draft", lines: lines, deliveryFee: fee, subtotal: subtotal, total: subtotal + fee,
      originalTotal: order.totalEst, requiresApproval: lineSig(lines) !== lineSig(order.lines) || order.deliveryFeeEst === null || fee !== order.deliveryFeeEst,
      createdAt: stamp(), updatedAt: stamp(), expiresAt: new Date(base0 + CFG.QUOTE_VALID_HOURS * 3600000).toISOString(), history: [{ status: "Draft", at: stamp() }] };
    S.quotations.unshift(q);
    order.quotationId = q.id;
    tl(order, "Quotation drafted", "Draft quotation " + q.id + " created.", "internal");
    return q;
  }
  function quoteStatus(q, status, note) {
    var allowed = { "Draft": ["Awaiting Customer Approval", "Approved", "Expired"], "Awaiting Customer Approval": ["Approved", "Rejected", "Expired"] };
    if (!has(allowed[q.status] || [], status)) fail("A " + q.status + " quotation cannot move to " + status + ".");
    if (q.status === "Draft" && status === "Approved" && q.requiresApproval) fail("This quotation differs from what the customer saw, so customer approval is required.");
    if (q.status === "Awaiting Customer Approval" && status !== "Expired" && Date.parse(q.expiresAt) < Date.now()) fail("This quotation has expired.");
    var order = byId(S.orders, q.orderRef, "ref");
    if (order.status === "Cancelled") fail("This order is cancelled.");
    q.status = status; q.updatedAt = stamp(); q.history.push({ status: status, at: stamp(), note: note || "" });
    if (status === "Awaiting Customer Approval") tl(order, "Awaiting your approval", "A final quotation is ready. Please review and approve it.", "quotation");
    else if (status === "Approved") {
      order.confirmedTotal = q.total; order.confirmedLines = clone(q.lines);
      if (stageIdx(order.status) < stageIdx("Confirmed")) setOrderStatus(order, "Confirmed", "Quotation approved. Confirmed total: " + HB_money(q.total) + ".", "quotation");
    } else if (status === "Rejected") cancelOrder(order, "Quotation declined. Order cancelled.");
    else if (status === "Expired") tl(order, "Quotation expired", "The quotation expired. HomeBasket may send a new one.", "quotation");
    return q;
  }
  function HB_money(n) { return "₦" + Math.round(n).toLocaleString("en-NG"); }

  /* ---------- seed ---------- */
  function seed() {
    T = null;
    S = { v: 2, createdAt: new Date().toISOString(), counters: { order: 1000, sr: 2000, quote: 4000, delivery: 5000, notif: 6000, bq: 3000 },
      products: clone(window.HB_PRODUCTS).map(function (p) { p.active = true; return p; }),
      suppliers: clone(D.suppliers), partners: clone(D.partners), zones: clone(D.zones),
      supplierProducts: [], preferred: {}, orders: [], sourcing: [], notifications: [], quotations: [], deliveries: [], businessQuotes: [] };
    S.suppliers.forEach(function (s, si) {
      S.products.forEach(function (p, pi) {
        if (has(s.categories, p.category)) S.supplierProducts.push({ supplierId: s.id, productId: p.id, cost: Math.round(p.price * s.costFactor / 50) * 50,
          availability: p.stock === "out_of_stock" ? "unavailable" : (p.stock === "low_stock" ? "low" : "available"),
          updatedAt: new Date(Date.now() - (1 + ((si + pi) % 6)) * 86400000).toISOString() });
      });
    });
    S.suppliers.forEach(function (s) { delete s.costFactor; });
    S.products.forEach(function (p) {
      var best = null;
      S.supplierProducts.forEach(function (sp) {
        if (sp.productId !== p.id) return;
        if (byId(S.suppliers, sp.supplierId).status !== "Approved") return;
        if (!best || sp.cost < best.cost) best = sp;
      });
      if (best) S.preferred[p.id] = best.supplierId;
    });
    if (CFG.LOAD_SAMPLE_RECORDS) D.seedOrders.forEach(seedOrder);
    (CFG.LOAD_SAMPLE_RECORDS ? D.businessQuotes : []).forEach(function (b) {
      T = Date.now() - b.hoursAgo * 3600000;
      var items = b.items.map(function (i) { var pr = byId(S.products, i[0]); return { productId: pr.id, name: pr.name, unit: pr.unit, qty: i[1], unitPrice: pr.price }; });
      S.businessQuotes.unshift({ id: "BQ-" + nextId("bq"), createdAt: stamp(), businessName: b.businessName, contact: b.contact, phone: b.phone, area: b.area,
        requirements: b.requirements, frequency: b.frequency, notes: b.notes, items: items, indicativeSubtotal: sum(items, function (l) { return l.qty * l.unitPrice; }), status: b.status, sample: true });
    });
    T = null;
    return S;
  }
  function seedOrder(def) {
    T = Date.now() - def.hoursAgo * 3600000;
    var order = createOrderInternal({ sample: true, customer: def.customer, zoneId: def.zoneId, deliveryOption: def.option,
      scheduledDate: def.option === "scheduled" ? dateStr(1) : "", lines: def.lines.map(function (l) { return { productId: l[0], qty: l[1] }; }) });
    tick(15);
    var srs = S.sourcing.filter(function (s) { return s.orderRef === order.ref; });
    var st = def.stage;
    if (st === "cancelled") { cancelOrder(order, "Cancelled at the customer's request."); return; }
    if (st === "received") return;
    srs.forEach(function (sr) {
      srUpdate(sr, { status: "Accepted", response: { lines: sr.lines.map(function (l) { return { productId: l.productId, proposedQty: l.qty, proposedUnitCost: l.indicativeCost }; }),
        note: sr.notificationStatus === "Failed" ? "Confirmed by phone after manual contact." : "Confirmed." } });
      tick(10);
    });
    var lines = order.lines.map(function (l) { return { productId: l.productId, qty: l.qty, unitPrice: l.unitPrice }; });
    if (def.adjustFirstLinePrice) lines[0].unitPrice += def.adjustFirstLinePrice;
    var q = quoteCreate(order, { lines: lines, deliveryFee: order.deliveryFeeEst });
    if (st === "quote-pending") { quoteStatus(q, "Awaiting Customer Approval"); return; }
    if (q.requiresApproval) quoteStatus(q, "Awaiting Customer Approval");
    quoteStatus(q, "Approved"); tick(20);
    setOrderStatus(order, "Sourcing", "Sourcing in progress.", "order");
    srs.forEach(function (sr) { srUpdate(sr, { status: "Preparing" }); });
    if (st === "sourcing") return;
    tick(120);
    srs.forEach(function (sr) { srUpdate(sr, { status: "Ready for Collection" }); srUpdate(sr, { status: "Collected" }); });
    setOrderStatus(order, "Packed", "Order packed.", "order");
    var d = byId(S.deliveries, order.deliveryId);
    deliveryAssign(d, def.zoneId === "z-awka" ? "dp-1" : (def.zoneId === "z-onitsha" ? "dp-2" : "dp-3"));
    d.accepted = true; tick(30);
    deliverySet(d, "Ready for Pickup"); deliverySet(d, "Picked Up"); tick(20); deliverySet(d, "Out for Delivery");
    if (st === "delivered") { tick(60); d.actualCost = d.estFee; deliverySet(d, "Delivered", "Delivered."); }
  }

  /* ---------- public service layer ---------- */
  function mut(fn) {
    return function () {
      var a = arguments;
      return new Promise(function (res, rej) {
        try { ensure(); sweepQuotes(); var r = fn.apply(null, a); save(); res(clone(r)); } catch (e) { rej(e); }
      });
    };
  }
  function rd(fn) {
    return function () {
      var a = arguments;
      return new Promise(function (res, rej) {
        try { ensure(); sweepQuotes(); res(clone(fn.apply(null, a))); } catch (e) { rej(e); }
      });
    };
  }
  core.mut = mut; core.rd = rd; core.state = function () { return ensure(); };
  core.notify = notify; core.byId = byId; core.fail = fail; core.stamp = stamp; core.nextId = nextId; core.supplierName = supplierName;

  var api = (HB.api = {});

  api.getProducts = rd(function (opts) { return S.products.filter(function (p) { return (opts && opts.includeInactive) || p.active; }); });
  api.getZones = rd(function () { return S.zones; });
  api.getSnapshot = rd(function () { return S; });

  api.createOrder = mut(function (payload) { return createOrderInternal(payload || {}); });
  api.getOrderByReference = rd(function (ref, opts) {
    var key = String(ref || "").trim().toUpperCase();
    var o = byId(S.orders, key, "ref");
    if (!o) return null;
    return (opts && opts.audience === "customer") ? customerView(o) : o;
  });
  /* Orders placed by a signed-in customer on this device, newest first (customer-safe views only). */
  api.getCustomerOrders = rd(function (customerId) {
    return S.orders.filter(function (o) { return customerId && o.customerId === customerId; })
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).map(customerView);
  });
  api.updateOrderStatus = mut(function (ref, status, note) {
    var o = byId(S.orders, ref, "ref"); if (!o) fail("Order not found.");
    if (o.status === "Cancelled") fail("This order is cancelled.");
    if (status === "Sourcing") {
      if (stageIdx(o.status) < stageIdx("Confirmed")) fail("Confirm the order (approved quotation) before sourcing.");
      if (stageIdx(o.status) >= stageIdx("Sourcing")) fail("The order is already at or past Sourcing.");
      setOrderStatus(o, "Sourcing", note || "Sourcing in progress.", "order");
    } else if (status === "Packed") {
      if (o.status !== "Sourcing") fail("Only an order in Sourcing can be marked Packed.");
      setOrderStatus(o, "Packed", note || "Order packed.", "order");
      var d = byId(S.deliveries, o.deliveryId);
      if (d && d.status === "Assigned") deliverySet(d, "Ready for Pickup", "Order packed");
    } else if (status === "Cancelled") cancelOrder(o, note || "Order cancelled by HomeBasket.");
    else if (status === "Delayed") { o.delayed = true; o.delayNote = note || "Your order is delayed. HomeBasket will update you."; tl(o, "Order delayed", o.delayNote, "order"); }
    else if (status === "Not delayed") { o.delayed = false; o.delayNote = ""; tl(o, "Delay cleared", "", "order"); }
    else fail("Unsupported status change.");
    return o;
  });

  api.getSuppliers = rd(function () { return { suppliers: S.suppliers, supplierProducts: S.supplierProducts, preferred: S.preferred }; });
  api.saveSupplier = mut(function (s) {
    if (String(s.name || "").trim().length < 3) fail("Supplier name is required.");
    if (!has(HB.SUPPLIER_STATUSES, s.status)) fail("Invalid supplier status.");
    var rec = s.id ? byId(S.suppliers, s.id) : null;
    if (s.id && !rec) fail("Supplier not found.");
    if (!rec) { rec = { id: "sup-" + (S.suppliers.length + 1 + Math.floor(Math.random() * 900)) }; S.suppliers.push(rec); }
    ["name", "contact", "phone", "area"].forEach(function (k) { rec[k] = String(s[k] || "").trim(); });
    rec.categories = (s.categories || []).filter(function (c) { return byId(window.HB_CATEGORIES, c); });
    rec.status = s.status; rec.channel = has(["whatsapp", "sms", "email"], s.channel) ? s.channel : "whatsapp"; rec.verifiedContact = !!s.verifiedContact;
    return rec;
  });
  api.saveSupplierProduct = mut(function (supplierId, productId, data) {
    var sup = byId(S.suppliers, supplierId), pr = byId(S.products, productId);
    if (!sup || !pr) fail("Supplier or product not found.");
    var rec = null;
    S.supplierProducts.forEach(function (sp) { if (sp.supplierId === supplierId && sp.productId === productId) rec = sp; });
    if (!rec) { rec = { supplierId: supplierId, productId: productId, cost: 0, availability: "available", updatedAt: stamp() }; S.supplierProducts.push(rec); }
    if (data.cost !== undefined) { var c = Number(data.cost); if (!(c >= 0)) fail("Cost must be zero or more."); if (c !== rec.cost) { rec.cost = c; rec.updatedAt = stamp(); } }
    if (data.availability !== undefined) { if (!has(["available", "low", "unavailable"], data.availability)) fail("Invalid availability."); rec.availability = data.availability; rec.updatedAt = stamp(); }
    return rec;
  });
  api.removeSupplierProduct = mut(function (supplierId, productId) {
    S.supplierProducts = S.supplierProducts.filter(function (sp) { return !(sp.supplierId === supplierId && sp.productId === productId); });
    if (S.preferred[productId] === supplierId) delete S.preferred[productId];
    return { ok: true };
  });
  api.setPreferredSupplier = mut(function (productId, supplierId) {
    if (!byId(S.products, productId)) fail("Product not found.");
    if (!supplierId) { delete S.preferred[productId]; return { productId: productId, supplierId: null }; }
    var sup = byId(S.suppliers, supplierId);
    if (!sup) fail("Supplier not found.");
    if (costOf(supplierId, productId) === null) fail("That supplier does not supply this product.");
    if (sup.status === "Suspended") fail("A suspended supplier cannot be selected.");
    S.preferred[productId] = supplierId;
    return { productId: productId, supplierId: supplierId, warning: sup.status === "Pending Review" ? "This supplier is still pending review." : "" };
  });
  api.createSourcingRequest = mut(function (orderRef, supplierId, productIds) {
    var o = byId(S.orders, orderRef, "ref"), sup = byId(S.suppliers, supplierId);
    if (!o) fail("Order not found."); if (!sup) fail("Supplier not found.");
    if (sup.status === "Suspended") fail("A suspended supplier cannot receive requests.");
    if (o.status === "Cancelled") fail("This order is cancelled.");
    if (!productIds || !productIds.length) fail("Choose at least one item.");
    var lines = productIds.map(function (pid) {
      var l = byId(o.lines, pid, "productId");
      if (!l) fail("Item is not part of this order.");
      if (costOf(supplierId, pid) === null) fail(l.name + " is not supplied by " + sup.name + ".");
      return l;
    });
    return createSR(o, supplierId, lines);
  });
  api.updateSourcingRequest = mut(function (ref, patch) {
    var sr = byId(S.sourcing, ref, "ref"); if (!sr) fail("Sourcing request not found.");
    return srUpdate(sr, patch || {});
  });

  api.getDeliveryAssignments = rd(function (filter) {
    return S.deliveries.filter(function (d) { return !filter || !filter.partnerId || d.partnerId === filter.partnerId; });
  });
  api.assignDelivery = mut(function (id, partnerId) { var d = byId(S.deliveries, id); if (!d) fail("Delivery not found."); return deliveryAssign(d, partnerId || null); });
  api.updateDeliveryStatus = mut(function (id, status, note) { var d = byId(S.deliveries, id); if (!d) fail("Delivery not found."); return deliverySet(d, status, note); });
  api.updateDeliveryDetails = mut(function (id, data) {
    var d = byId(S.deliveries, id); if (!d) fail("Delivery not found.");
    if (data.actualCost !== undefined && data.actualCost !== "") { var c = Number(data.actualCost); if (!(c >= 0)) fail("Actual cost must be zero or more."); d.actualCost = c; }
    if (data.note) d.notes.push({ at: stamp(), text: String(data.note).slice(0, 300) });
    if (data.pod !== undefined) d.pod = String(data.pod).slice(0, 300);
    if (data.accepted !== undefined) d.accepted = !!data.accepted;
    d.updatedAt = stamp(); return d;
  });
  api.saveZone = mut(function (id, fee) {
    var z = byId(S.zones, id); if (!z) fail("Zone not found.");
    if (fee === null || fee === "") z.fee = null; else { var f = Number(fee); if (!(f >= 0)) fail("Fee must be zero or more."); z.fee = f; }
    return z;
  });
  api.setPartnerAvailability = mut(function (id, available) { var p = byId(S.partners, id); if (!p) fail("Partner not found."); p.available = !!available; return p; });

  api.submitBusinessQuoteRequest = mut(function (p) {
    if (String(p.businessName || "").trim().length < 2) fail("Business name is required.");
    if (String(p.contact || "").trim().length < 2) fail("Contact person is required.");
    if (!HB.normalizeNgPhone(p.phone)) fail("A valid Nigerian phone number is required.");
    if (!String(p.area || "").trim()) fail("Delivery area is required.");
    if (!String(p.requirements || "").trim() && !(p.items && p.items.length)) fail("Describe your requirements or select products.");
    /* Optional fields (validated only when supplied, so existing callers keep working) */
    var category = String(p.category || "").trim();
    if (category && !has(HB.BUSINESS_CATEGORIES, category)) fail("Choose a valid business category.");
    var deliveryAddress = String(p.deliveryAddress || "").trim();
    if (p.deliveryAddress !== undefined && deliveryAddress.length < 8) fail("A full delivery address is required.");
    var preferredDate = String(p.preferredDate || "").trim();
    if (preferredDate && !(/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) && preferredDate >= dateStr(0))) fail("Choose a delivery date that is today or later.");
    var items = (p.items || []).map(function (i) {
      var pr = byId(S.products, i.productId), q = Number(i.qty);
      if (!pr || !(Number.isInteger(q) && q >= 1 && q <= 999)) fail("Quantities must be whole numbers from 1 to 999.");
      return { productId: pr.id, name: pr.name, unit: pr.unit, qty: q, unitPrice: pr.price };
    });
    var bq = { id: "BQ-" + nextId("bq"), createdAt: stamp(), businessName: p.businessName.trim(), contact: p.contact.trim(), phone: HB.normalizeNgPhone(p.phone), area: String(p.area).trim(),
      category: category, deliveryAddress: deliveryAddress.slice(0, 300), preferredDate: preferredDate,
      requirements: String(p.requirements || "").trim().slice(0, 1000), frequency: p.frequency || "One-off", notes: String(p.notes || "").trim().slice(0, 500), items: items,
      indicativeSubtotal: sum(items, function (l) { return l.qty * l.unitPrice; }), status: "New", sample: false };
    S.businessQuotes.unshift(bq);
    return bq;
  });
  api.updateBusinessQuoteStatus = mut(function (id, status) {
    var b = byId(S.businessQuotes, id); if (!b) fail("Quote request not found.");
    if (!has(HB.BQ_STATUSES, status)) fail("Invalid status."); b.status = status; return b;
  });

  api.prepareFinalQuotation = mut(function (orderRef, opts) {
    var o = byId(S.orders, orderRef, "ref"); if (!o) fail("Order not found.");
    return quoteCreate(o, opts);
  });
  api.updateQuotationStatus = mut(function (id, status, note) { var q = byId(S.quotations, id); if (!q) fail("Quotation not found."); return quoteStatus(q, status, note); });
  api.recordCustomerQuotationApproval = mut(function (id, decision) {
    var q = byId(S.quotations, id); if (!q) fail("Quotation not found.");
    if (decision !== "Approved" && decision !== "Rejected") fail("Decision must be Approved or Rejected.");
    if (q.status !== "Awaiting Customer Approval") fail("This quotation is not awaiting approval (status: " + q.status + ").");
    return quoteStatus(q, decision, "Recorded by HomeBasket");
  });

  api.saveProduct = mut(function (p) {
    if (String(p.name || "").trim().length < 2) fail("Product name is required.");
    if (!byId(window.HB_CATEGORIES, p.category)) fail("Choose a category.");
    var price = Number(p.price); if (!(price > 0)) fail("Selling price must be greater than zero.");
    if (!String(p.unit || "").trim()) fail("Unit is required.");
    if (!has(["in_stock", "low_stock", "out_of_stock"], p.stock)) fail("Invalid availability.");
    var rec = p.id ? byId(S.products, p.id) : null;
    if (p.id && !rec) fail("Product not found.");
    if (!rec) {
      var base = (p.name + "-" + p.unit).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40), id = base, n = 2;
      while (byId(S.products, id)) id = base + "-" + (n++);
      rec = { id: id, image: "assets/images/" + id + ".jpg" }; S.products.push(rec);
    }
    rec.name = p.name.trim(); rec.category = p.category; rec.unit = p.unit.trim(); rec.price = price; rec.stock = p.stock;
    rec.emoji = String(p.emoji || "").trim() || (HB.getCategory(p.category) || {}).emoji || "🛒";
    rec.description = String(p.description || "").trim().slice(0, 200); rec.active = p.active !== false;
    return rec;
  });
  api.resetRecords = function () {
    return new Promise(function (res) { HB.storage.remove("session", CFG.STATE_KEY); S = null; ensure(); window.dispatchEvent(new Event("hb:state-change")); res(true); });
  };
})();
