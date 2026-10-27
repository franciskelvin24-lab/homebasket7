/* ==========================================================================
   HomeBasket — admin area: shell, overview, orders (+detail, quotation flow),
   products, reports. Other sections register themselves from suppliers.js,
   deliveries.js and business.js. NOTE: there is no real login yet.
   ========================================================================== */
(function () {
  "use strict";
  var HB = window.HB, A = (HB.admin = HB.admin || { sections: {} });
  var esc = HB.escapeHtml, fmt = HB.formatNaira;
  A.ORDER = ["overview", "orders", "products", "suppliers", "sourcing", "deliveries", "quotes", "reports"];
  A.ui = { orders: { q: "", status: "", sort: "date-desc" } };
  A.snap = null;
  A.byId = function (arr, id, key) { key = key || "id"; for (var i = 0; i < arr.length; i++) if (arr[i][key] === id) return arr[i]; return null; };
  A.supplierName = function (snap, id) { var s = A.byId(snap.suppliers, id); return s ? s.name : id; };
  A.act = function (promise, okMsg) { return HB.run(promise, okMsg).then(function (r) { return A.refresh().then(function () { return r; }); }, function () {}); };
  A.refresh = function () { return HB.api.getSnapshot().then(function (s) { A.snap = s; A.render(); }); };
  A.cost = function (snap, supplierId, productId) {
    var sp = snap.supplierProducts.filter(function (x) { return x.supplierId === supplierId && x.productId === productId; })[0];
    return sp ? sp.cost : null;
  };
  A.promptNote = function (title, label, preset) {
    return new Promise(function (resolve) {
      var got = null, ctl = HB.modal({ title: title, body: '<div class="field"><label for="pn-text">' + esc(label) + '</label><textarea id="pn-text" rows="3">' + esc(preset || "") + "</textarea></div>",
        actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save", cls: "btn-primary", onClick: function (c) { got = c.el.querySelector("#pn-text").value.trim(); } }],
        onClose: function () { resolve(got); }, onOpen: function (c) { c.el.querySelector("#pn-text").focus(); } });
      return ctl;
    });
  };
  A.table = function (heads, rows, empty) {
    if (!rows) return '<p class="muted">' + (empty || "Nothing to show.") + "</p>";
    return '<div class="table-wrap"><table class="table"><thead><tr>' + heads.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  };
  A.deliveryOf = function (snap, o) { return A.byId(snap.deliveries, o.deliveryId); };
  A.orderTotal = function (o) { return o.confirmedTotal !== null && o.confirmedTotal !== undefined ? o.confirmedTotal : o.totalEst; };

  /* ---------- warnings (supplier prices/stock may have changed) ---------- */
  A.warningsFor = function (o, snap) {
    var w = [], stale = 0, short = [];
    snap.sourcing.filter(function (s) { return s.orderRef === o.ref; }).forEach(function (sr) {
      sr.lines.forEach(function (l) {
        var sp = snap.supplierProducts.filter(function (x) { return x.supplierId === sr.supplierId && x.productId === l.productId; })[0];
        if (sp && HB.daysAgo(sp.updatedAt) >= 3) stale++;
        if (sp && sp.availability !== "available") short.push(l.name);
      });
      if (sr.response) sr.response.lines.forEach(function (rl) {
        var il = sr.lines.filter(function (x) { return x.productId === rl.productId; })[0]; if (!il) return;
        if (rl.proposedUnitCost > il.indicativeCost) w.push("Supplier proposed a higher cost for " + il.name + " (" + fmt(il.indicativeCost) + " → " + fmt(rl.proposedUnitCost) + ").");
        if (rl.proposedQty < il.qty) w.push("Supplier can supply only " + rl.proposedQty + " of " + il.qty + " for " + il.name + ".");
      });
      if (sr.status === "Declined") w.push(sr.ref + " was declined. Choose another supplier and create a new request.");
      if (sr.notificationStatus === "Failed") w.push("The notification for " + sr.ref + " failed. Retry it or contact the supplier manually (Sourcing section).");
    });
    if (stale) w.push(stale + " supplier price(s) were last updated 3+ days ago and may have changed.");
    if (short.length) w.push("Supplier stock is low or unavailable for: " + short.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(", ") + ".");
    if (o.timeline.some(function (e) { return e.status === "Unassigned items"; })) w.push("Some items had no supplier selected. Create a sourcing request manually.");
    var changed = o.lines.filter(function (l) { var p = A.byId(snap.products, l.productId); return p && p.price !== l.unitPrice; }).map(function (l) { return l.name; });
    if (changed.length) w.push("Catalogue price changed since the customer ordered: " + changed.join(", ") + ". The customer's snapshot price still applies until a quotation is approved.");
    return w;
  };

  /* ---------- orders table (shared by overview + orders) ---------- */
  function ordersTable(list, snap) {
    var rows = list.map(function (o) {
      var d = A.deliveryOf(snap, o), n = o.sourcingIds.length;
      return '<tr><td><a href="#orders/' + o.ref + '"><strong>' + o.ref + "</strong></a>" + (o.sample ? '<br><small class="muted">Sample record</small>' : "") + "</td><td>" + esc(o.customer.name) + '<br><small class="muted">' + esc(o.customer.area) + "</small></td><td>" + HB.formatDateTime(o.createdAt) + "</td><td>" +
        fmt(A.orderTotal(o)) + (o.confirmedTotal !== null ? '<br><small class="muted">confirmed</small>' : '<br><small class="muted">estimate</small>') + "</td><td>" + HB.badge(o.paymentStatus) + "</td><td>" + HB.badge(o.status) + (o.delayed ? " " + HB.badge("Delayed") : "") +
        '</td><td>' + n + " request" + (n === 1 ? "" : "s") + "</td><td>" + (d ? HB.badge(d.cancelled ? "Cancelled" : d.status) : "-") + "</td></tr>";
    }).join("");
    return A.table(["Reference", "Customer", "Date", "Amount", "Payment", "Fulfilment", "Sourcing", "Delivery"], rows, "No orders match.");
  }

  /* ---------- overview ---------- */
  A.sections.overview = { label: "Overview", render: function (root, snap) {
    var active = snap.orders.filter(function (o) { return o.status !== "Cancelled"; });
    var cards = [
      ["Orders", snap.orders.length, "stored in this browser"],
      ["Estimated sales", fmt(active.reduce(function (s, o) { return s + A.orderTotal(o); }, 0)), "excluding cancelled; not payments received"],
      ["Pending supplier confirmations", snap.sourcing.filter(function (s) { return s.status === "New Request"; }).length, "requests awaiting a supplier reply"],
      ["Active deliveries", snap.deliveries.filter(function (d) { return !d.cancelled && ["Assigned", "Ready for Pickup", "Picked Up", "Out for Delivery"].indexOf(d.status) > -1; }).length, "assigned to out for delivery"],
      ["Quotation requests", snap.businessQuotes.filter(function (b) { return b.status === "New" || b.status === "In Review"; }).length, "business enquiries to answer"]
    ].map(function (c) { return '<div class="stat-card"><p class="stat-label">' + c[0] + '</p><p class="stat-value">' + c[1] + '</p><p class="stat-note">' + c[2] + "</p></div>"; }).join("");
    var failed = snap.notifications.filter(function (n) { return n.direction === "outbound" && n.status === "Failed"; }).length;
    var recent = snap.orders.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 5);
    root.innerHTML = '<div class="dash-head"><h1>Overview</h1></div><div class="stat-grid">' + cards + "</div>" +
      (failed ? '<div class="alert alert-warn">' + failed + ' supplier notification(s) failed. <a href="#sourcing">Review in Sourcing</a>.</div>' : "") +
      '<section class="form-card"><div class="row-between"><h2>Recent orders</h2><a class="btn btn-outline btn-sm" href="#orders">All orders</a></div>' + ordersTable(recent, snap) + "</section>";
  } };

  /* ---------- orders list ---------- */
  A.sections.orders = { label: "Orders", render: function (root, snap, arg) {
    if (arg) return orderDetail(root, snap, arg);
    var u = A.ui.orders;
    root.innerHTML = '<div class="dash-head"><h1>Orders</h1></div><section class="form-card"><div class="filters">' +
      '<div class="field"><label for="of-q">Search</label><input id="of-q" type="search" placeholder="Reference or customer" value="' + esc(u.q) + '"></div>' +
      '<div class="field"><label for="of-status">Status</label><select id="of-status"><option value="">All</option>' + HB.ORDER_STAGES.concat(["Cancelled", "Delayed"]).map(function (s) { return "<option" + (u.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="of-sort">Sort</label><select id="of-sort"><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Amount: high to low</option><option value="amount-asc">Amount: low to high</option></select></div></div>' +
      '<div id="orders-table"></div></section>';
    var sortEl = root.querySelector("#of-sort"); sortEl.value = u.sort;
    function draw() {
      var q = u.q.toLowerCase();
      var list = snap.orders.filter(function (o) {
        if (u.status === "Delayed" ? !o.delayed : (u.status && o.status !== u.status)) return false;
        return !q || (o.ref + " " + o.customer.name).toLowerCase().indexOf(q) > -1;
      }).sort(function (a, b) {
        if (u.sort === "amount-desc") return A.orderTotal(b) - A.orderTotal(a); if (u.sort === "amount-asc") return A.orderTotal(a) - A.orderTotal(b);
        return u.sort === "date-asc" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
      });
      root.querySelector("#orders-table").innerHTML = ordersTable(list, snap);
    }
    root.querySelector("#of-q").addEventListener("input", function (e) { u.q = e.target.value.trim(); draw(); });
    root.querySelector("#of-status").addEventListener("change", function (e) { u.status = e.target.value; draw(); });
    sortEl.addEventListener("change", function (e) { u.sort = e.target.value; draw(); });
    draw();
  } };

  /* ---------- order detail ---------- */
  function orderDetail(root, snap, ref) {
    var o = A.byId(snap.orders, ref, "ref");
    if (!o) { root.innerHTML = '<p>Order not found.</p><a href="#orders">Back to orders</a>'; return; }
    var d = A.deliveryOf(snap, o), srs = snap.sourcing.filter(function (s) { return s.orderRef === ref; });
    var q = o.quotationId ? A.byId(snap.quotations, o.quotationId) : null;
    var warns = A.warningsFor(o, snap), closed = o.status === "Cancelled" || o.status === "Delivered";

    var itemRows = o.lines.map(function (l) {
      var sid = snap.preferred[l.productId], cost = sid ? A.cost(snap, sid, l.productId) : null;
      var opts = snap.supplierProducts.filter(function (sp) { return sp.productId === l.productId; }).map(function (sp) {
        var s = A.byId(snap.suppliers, sp.supplierId);
        return '<option value="' + s.id + '"' + (s.id === sid ? " selected" : "") + (s.status === "Suspended" ? " disabled" : "") + ">" + esc(s.name) + " (" + s.status + ", " + fmt(sp.cost) + ")</option>";
      }).join("");
      var margin = cost !== null ? Math.round((l.unitPrice - cost) / l.unitPrice * 100) + "%" : "-";
      return "<tr><td>" + esc(l.name) + '<br><small class="muted">' + esc(l.unit) + "</small></td><td>" + l.qty + "</td><td>" + fmt(l.unitPrice) + "</td><td>" + fmt(l.qty * l.unitPrice) + "</td>" +
        '<td class="admin-only"><label class="sr-only" for="ps-' + l.productId + '">Preferred supplier for ' + esc(l.name) + '</label><select id="ps-' + l.productId + '" data-pref="' + l.productId + '"><option value="">None</option>' + opts + "</select></td><td class=\"admin-only\">" + (cost !== null ? fmt(cost) : "-") + "</td><td class=\"admin-only\">" + margin + "</td></tr>";
    }).join("");

    var srList = srs.length ? srs.map(function (s) {
      return "<li><strong>" + s.ref + "</strong> · " + esc(A.supplierName(snap, s.supplierId)) + " " + HB.badge(s.status) + " " + HB.badge(s.notificationStatus || "No notification") + "<br><small class=\"muted\">" + s.lines.map(function (l) { return l.qty + " × " + esc(l.name); }).join(", ") + "</small></li>";
    }).join("") : '<li class="muted">No sourcing requests.</li>';

    var qHtml;
    if (!q) qHtml = '<p class="muted">No quotation prepared yet.</p>' + (closed ? "" : '<button type="button" class="btn btn-primary" data-act="prep-quote">Prepare final quotation</button>');
    else {
      var btns = "";
      if (q.status === "Draft") btns = q.requiresApproval ? '<button type="button" class="btn btn-primary" data-act="qstatus" data-status="Awaiting Customer Approval">Send for customer approval</button>' : '<button type="button" class="btn btn-primary" data-act="qstatus" data-status="Approved">Confirm (no change from what the customer saw)</button>';
      if (q.status === "Awaiting Customer Approval") btns = '<button type="button" class="btn btn-primary" data-act="qdecision" data-status="Approved">Record customer approval</button> <button type="button" class="btn btn-outline" data-act="qdecision" data-status="Rejected">Record customer rejection</button> <button type="button" class="btn btn-ghost" data-act="qstatus" data-status="Expired">Mark expired</button>';
      if (!closed && (q.status === "Draft" || q.status === "Expired" || q.status === "Awaiting Customer Approval")) btns += ' <button type="button" class="btn btn-outline" data-act="prep-quote">Prepare a new quotation</button>';
      qHtml = "<p>" + HB.badge(q.status) + " " + q.id + (q.requiresApproval ? " · " + HB.badge("Customer approval required") : "") + '</p><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' +
        q.lines.map(function (l) { return "<tr><td>" + esc(l.name) + (l.note ? '<br><small class="muted">' + esc(l.note) + "</small>" : "") + "</td><td>" + l.qty + "</td><td>" + fmt(l.unitPrice) + "</td><td>" + fmt(l.qty * l.unitPrice) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        "<p>Delivery fee " + fmt(q.deliveryFee) + " · <strong>Total " + fmt(q.total) + "</strong> (customer saw " + fmt(q.originalTotal) + ")<br><small class=\"muted\">Valid until " + HB.formatDateTime(q.expiresAt) + "</small></p>" +
        (btns ? '<div class="btn-row">' + btns + "</div>" : "") + '<details><summary>History</summary><ul class="activity">' + q.history.map(function (h) { return "<li>" + esc(h.status) + ' <small class="muted">' + HB.formatDateTime(h.at) + (h.note ? " · " + esc(h.note) : "") + "</small></li>"; }).join("") + "</ul></details>";
    }

    var partnerOpts = snap.partners.map(function (p) { return '<option value="' + p.id + '"' + (d && d.partnerId === p.id ? " selected" : "") + ">" + esc(p.name) + (p.available ? "" : " (unavailable)") + "</option>"; }).join("");
    var tlHtml = o.timeline.slice().reverse().map(function (e) {
      return '<li class="src-' + e.source + '"><strong>' + esc(e.status) + "</strong> " + '<span class="badge badge-neutral">' + (e.source === "internal" || e.source === "sourcing" ? "internal" : e.source) + "</span> <small class=\"muted\">" + HB.formatDateTime(e.at) + "</small>" + (e.note ? "<br>" + esc(e.note) : "") + "</li>";
    }).join("");

    root.innerHTML = '<div class="dash-head"><div><a href="#orders">← All orders</a><h1>' + o.ref + "</h1></div><p>" + HB.badge(o.status) + (o.delayed ? " " + HB.badge("Delayed") : "") + " " + HB.badge(o.paymentStatus) + "</p></div>" +
      (warns.length ? '<div class="alert alert-warn"><strong>Check before confirming</strong><ul>' + warns.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<div class="status-grid"><section class="form-card"><h2>Customer order status</h2><p>' + HB.badge(o.status) + '</p><div class="btn-row">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="ostatus" data-status="Sourcing"' + (o.status === "Confirmed" ? "" : " disabled") + '>Mark Sourcing</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="ostatus" data-status="Packed"' + (o.status === "Sourcing" ? "" : " disabled") + ">Mark Packed</button>" +
        (o.delayed ? '<button type="button" class="btn btn-outline btn-sm" data-act="ostatus" data-status="Not delayed">Clear delay</button>' : '<button type="button" class="btn btn-outline btn-sm" data-act="delay"' + (closed ? " disabled" : "") + ">Mark delayed</button>") +
        '<button type="button" class="btn btn-danger btn-sm" data-act="cancel"' + (closed ? " disabled" : "") + ">Cancel order</button></div><p class=\"note\">Confirmed happens only when a quotation is approved.</p></section>" +
      '<section class="form-card"><h2>Supplier sourcing</h2><ul class="activity">' + srList + '</ul><div class="btn-row"><button type="button" class="btn btn-outline btn-sm" data-act="new-sr"' + (closed ? " disabled" : "") + '>Create sourcing request</button> <a class="btn btn-ghost btn-sm" href="#sourcing">Sourcing</a></div></section>' +
      '<section class="form-card"><h2>Delivery</h2>' + (d ? "<p>" + HB.badge(d.cancelled ? "Cancelled" : d.status) + "</p><p>Estimated fee: " + fmt(d.estFee) + "<br>Actual cost: " + (d.actualCost !== null ? fmt(d.actualCost) : "not recorded") + '</p><div class="field"><label for="dp-sel">Delivery partner</label><select id="dp-sel"><option value="">Unassigned</option>' + partnerOpts + '</select></div><button type="button" class="btn btn-outline btn-sm" data-act="assign"' + (closed ? " disabled" : "") + '>Save assignment</button> <a class="btn btn-ghost btn-sm" href="#deliveries">Deliveries</a>' : "<p>No delivery record.</p>") + "</section></div>" +
      '<section class="form-card"><h2>Customer and delivery details</h2><dl class="review-list"><div><dt>Name</dt><dd>' + esc(o.customer.name) + "</dd></div><div><dt>Phone</dt><dd>" + esc(o.customer.phone) + "</dd></div><div><dt>Area</dt><dd>" + esc(o.customer.area) + "</dd></div><div><dt>Address</dt><dd>" + esc(o.customer.address) + "</dd></div><div><dt>Instructions</dt><dd>" + esc(o.customer.instructions || "None") + "</dd></div><div><dt>Delivery option</dt><dd>" + (o.deliveryOption === "scheduled" ? "Scheduled for " + esc(o.scheduledDate) : "Standard") + "</dd></div></dl></section>" +
      '<section class="form-card"><h2>Items and price breakdown</h2><p class="note">Selling prices are the customer snapshot. Shaded columns are admin-only. Changing the preferred supplier affects future routing only.</p>' +
        A.table(["Item", "Qty", "Selling price", "Line total", "Preferred supplier", "Supplier cost", "Margin"], itemRows) +
        '<dl class="summary-rows"><div><dt>Items subtotal</dt><dd>' + fmt(o.subtotalEst) + "</dd></div><div><dt>Delivery fee estimate</dt><dd>" + fmt(o.deliveryFeeEst) + "</dd></div><div><dt>Estimated total</dt><dd>" + fmt(o.totalEst) + '</dd></div><div class="total"><dt>Confirmed total</dt><dd>' + (o.confirmedTotal !== null ? fmt(o.confirmedTotal) : "Not yet confirmed") + "</dd></div></dl></section>" +
      '<section class="form-card"><h2>Final quotation</h2>' + qHtml + '</section><section class="form-card"><h2>Timeline</h2><ul class="activity">' + tlHtml + "</ul></section>";

    root.querySelectorAll("[data-pref]").forEach(function (sel) {
      sel.addEventListener("change", function () { HB.run(HB.api.setPreferredSupplier(sel.dataset.pref, sel.value), "Preferred supplier updated.").then(function (r) { if (r.warning) HB.toast(r.warning, "error"); return A.refresh(); }, function () { return A.refresh(); }); });
    });
    root.addEventListener("click", function handler(e) {
      var b = e.target.closest("[data-act]"); if (!b || !root.contains(b)) return;
      var act = b.dataset.act, st = b.dataset.status;
      if (act === "ostatus") A.act(HB.api.updateOrderStatus(ref, st), "Order updated.");
      else if (act === "delay") A.promptNote("Mark order delayed", "Message shown to the customer", "Your order is delayed. HomeBasket will update you.").then(function (n) { if (n) A.act(HB.api.updateOrderStatus(ref, "Delayed", n), "Marked as delayed."); });
      else if (act === "cancel") HB.confirm("Cancel order " + ref + "? This cannot be undone.", { title: "Cancel order", confirmLabel: "Cancel order", danger: true }).then(function (ok) { if (ok) A.act(HB.api.updateOrderStatus(ref, "Cancelled", "Order cancelled by admin."), "Order cancelled."); });
      else if (act === "assign") A.act(HB.api.assignDelivery(d.id, root.querySelector("#dp-sel").value), "Delivery assignment saved.");
      else if (act === "new-sr") newSourcingModal(o, snap);
      else if (act === "prep-quote") quoteModal(o, srs, snap);
      else if (act === "qstatus") HB.confirm("Change quotation " + q.id + " to “" + st + "”?", { confirmLabel: "Yes, continue" }).then(function (ok) { if (ok) A.act(HB.api.updateQuotationStatus(q.id, st), "Quotation updated."); });
      else if (act === "qdecision") HB.confirm("Record that the customer " + (st === "Approved" ? "approved" : "rejected") + " quotation " + q.id + "? " + (st === "Rejected" ? "The order will be cancelled." : "The order becomes Confirmed."), { title: "Record customer decision", confirmLabel: "Record", danger: st === "Rejected" }).then(function (ok) { if (ok) A.act(HB.api.recordCustomerQuotationApproval(q.id, st), "Decision recorded."); });
    });
    A._detailHandler = true;
  }

  function newSourcingModal(o, snap) {
    var sup = snap.suppliers.filter(function (s) { return s.status !== "Suspended"; });
    var ctl = HB.modal({ title: "Create sourcing request", wide: true, body: '<div class="field"><label for="nsr-sup">Supplier</label><select id="nsr-sup">' + sup.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + " (" + s.status + ")</option>"; }).join("") + '</select></div><div id="nsr-lines"></div><p class="note">Only the ticked items are sent to this supplier, never the whole customer order or the customer\'s details.</p>',
      actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Create request", cls: "btn-primary", onClick: function (c) {
        var ids = [].map.call(c.el.querySelectorAll("#nsr-lines input:checked"), function (i) { return i.value; });
        if (!ids.length) { HB.toast("Tick at least one item.", "error"); return false; }
        return A.act(HB.api.createSourcingRequest(o.ref, c.el.querySelector("#nsr-sup").value, ids), "Sourcing request created.").then(function (r) { return r ? undefined : false; });
      } }] });
    function draw() {
      var sid = ctl.el.querySelector("#nsr-sup").value;
      ctl.el.querySelector("#nsr-lines").innerHTML = o.lines.map(function (l) {
        var cost = A.cost(snap, sid, l.productId), existing = snap.sourcing.filter(function (s) { return s.orderRef === o.ref && s.supplierId === sid && s.lines.some(function (x) { return x.productId === l.productId; }); })[0];
        return '<label class="check-row"><input type="checkbox" value="' + l.productId + '"' + (cost === null ? " disabled" : "") + "> " + esc(l.name) + " × " + l.qty + ' <small class="muted">' + (cost === null ? "not supplied by this supplier" : "indicative cost " + fmt(cost)) + (existing ? " · already in " + existing.ref : "") + "</small></label>";
      }).join("");
    }
    ctl.el.querySelector("#nsr-sup").addEventListener("change", draw); draw();
  }

  function quoteModal(o, srs, snap) {
    var rows = o.lines.map(function (l) {
      var cur = A.byId(snap.products, l.productId), hints = [];
      srs.forEach(function (sr) { if (sr.response) sr.response.lines.forEach(function (rl) { if (rl.productId === l.productId) hints.push("Supplier offer: " + rl.proposedQty + " @ " + fmt(rl.proposedUnitCost)); }); });
      return '<tr data-pid="' + l.productId + '"><td><input type="checkbox" checked aria-label="Include ' + esc(l.name) + '"></td><td>' + esc(l.name) + '<br><small class="muted">' + esc(l.unit) + (cur && cur.price !== l.unitPrice ? " · catalogue now " + fmt(cur.price) : "") + (hints.length ? " · " + esc(hints.join("; ")) : "") +
        '</small></td><td><input type="number" class="q-qty" min="1" value="' + l.qty + '" aria-label="Quantity"></td><td><input type="number" class="q-price" min="0" step="50" value="' + l.unitPrice + '" aria-label="Unit price"></td><td><input type="text" class="q-note" maxlength="120" placeholder="Note (optional)" aria-label="Note"></td></tr>';
    }).join("");
    var ctl = HB.modal({ title: "Prepare final quotation", wide: true, body: '<p class="note">One HomeBasket price per item. Untick items that cannot be supplied. If anything differs from what the customer saw, the customer must approve.</p><div class="table-wrap"><table class="table"><thead><tr><th>Incl.</th><th>Item</th><th>Qty</th><th>Unit price (₦)</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="field"><label for="q-fee">Delivery fee (₦)</label><input id="q-fee" type="number" min="0" step="50" value="' + (o.deliveryFeeEst === null ? "" : o.deliveryFeeEst) + '"></div><p id="q-preview" class="alert alert-info"></p>',
      actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save draft quotation", cls: "btn-primary", onClick: function (c) {
        var lines = [].map.call(c.el.querySelectorAll("tbody tr"), function (tr) { return tr.querySelector("input[type=checkbox]").checked ? { productId: tr.dataset.pid, qty: tr.querySelector(".q-qty").value, unitPrice: tr.querySelector(".q-price").value, note: tr.querySelector(".q-note").value } : null; }).filter(Boolean);
        var feeV = c.el.querySelector("#q-fee").value;
        if (feeV === "") { HB.toast("Enter a delivery fee (use 0 for none).", "error"); return false; }
        return A.act(HB.api.prepareFinalQuotation(o.ref, { lines: lines, deliveryFee: feeV }), "Draft quotation saved.").then(function (r) { return r ? undefined : false; });
      } }] });
    function preview() {
      var total = 0, changed = false;
      ctl.el.querySelectorAll("tbody tr").forEach(function (tr) {
        var l = A.byId(o.lines, tr.dataset.pid, "productId"), on = tr.querySelector("input[type=checkbox]").checked, qty = Number(tr.querySelector(".q-qty").value), pr = Number(tr.querySelector(".q-price").value);
        if (!on) { changed = true; return; } total += qty * pr; if (qty !== l.qty || pr !== l.unitPrice) changed = true;
      });
      var fee = Number(ctl.el.querySelector("#q-fee").value || 0); if (o.deliveryFeeEst === null || fee !== o.deliveryFeeEst) changed = true;
      ctl.el.querySelector("#q-preview").innerHTML = "Quotation total: <strong>" + fmt(total + fee) + "</strong> (customer saw " + fmt(o.totalEst) + "). " + (changed ? "<strong>Differs from what the customer saw, so customer approval is required.</strong>" : "Same as what the customer saw.");
    }
    ctl.el.addEventListener("input", preview); ctl.el.addEventListener("change", preview); preview();
  }

  /* ---------- products ---------- */
  A.sections.products = { label: "Products", render: function (root, snap) {
    var rows = snap.products.map(function (p) {
      var sid = snap.preferred[p.id], cost = sid ? A.cost(snap, sid, p.id) : null, cat = HB.getCategory(p.category);
      return "<tr" + (p.active ? "" : ' class="row-muted"') + "><td>" + esc(p.emoji) + " <strong>" + esc(p.name) + '</strong><br><small class="muted">' + esc(p.unit) + " · " + esc(cat ? cat.name : "") + "</small></td><td>" + fmt(p.price) + "</td><td>" + HB.stockBadge(p.stock) + '</td><td class="admin-only">' + (sid ? esc(A.supplierName(snap, sid)) : '<span class="muted">None</span>') + '</td><td class="admin-only">' + (cost !== null ? fmt(cost) : "-") + '</td><td class="admin-only">' + (cost !== null ? Math.round((p.price - cost) / p.price * 100) + "%" : "-") + "</td><td>" + HB.badge(p.active ? "Active" : "Inactive") + '</td><td><button type="button" class="btn btn-ghost btn-sm" data-edit="' + p.id + '">Edit</button> <button type="button" class="btn btn-ghost btn-sm" data-toggle="' + p.id + '">' + (p.active ? "Deactivate" : "Activate") + "</button></td></tr>";
    }).join("");
    root.innerHTML = '<div class="dash-head"><h1>Products</h1><button type="button" class="btn btn-primary" id="add-product">Add product</button></div><section class="form-card"><p class="note">Customers see only the selling price. Supplier and margin columns are admin-only. </p>' +
      A.table(["Product", "Selling price", "Availability", "Preferred supplier", "Cost", "Margin", "Status", ""], rows) + "</section>";
    function form(p) {
      p = p || { name: "", category: "groceries", unit: "", price: "", stock: "in_stock", emoji: "", description: "", active: true };
      HB.modal({ title: p.id ? "Edit product" : "Add product", body: '<div class="field"><label for="pf-name">Name</label><input id="pf-name" value="' + esc(p.name) + '"></div><div class="field"><label for="pf-cat">Category</label><select id="pf-cat">' + window.HB_CATEGORIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === p.category ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></div>' +
        '<div class="field"><label for="pf-unit">Unit (e.g. 25kg bag, carton, pack)</label><input id="pf-unit" value="' + esc(p.unit) + '"></div><div class="field"><label for="pf-price">Selling price (₦)</label><input id="pf-price" type="number" min="1" value="' + esc(p.price) + '"></div>' +
        '<div class="field"><label for="pf-stock">Availability</label><select id="pf-stock">' + Object.keys(HB.STOCK).map(function (k) { return '<option value="' + k + '"' + (k === p.stock ? " selected" : "") + ">" + HB.STOCK[k][0] + "</option>"; }).join("") + '</select></div>' +
        '<div class="field"><label for="pf-emoji">Placeholder emoji (optional)</label><input id="pf-emoji" maxlength="4" value="' + esc(p.emoji) + '"></div><div class="field"><label for="pf-desc">Description</label><textarea id="pf-desc" rows="2">' + esc(p.description) + '</textarea></div><label class="check-row"><input type="checkbox" id="pf-active"' + (p.active ? " checked" : "") + "> Active (visible to customers)</label>",
        actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save product", cls: "btn-primary", onClick: function (c) {
          var g = function (id) { return c.el.querySelector(id); };
          return A.act(HB.api.saveProduct({ id: p.id, name: g("#pf-name").value, category: g("#pf-cat").value, unit: g("#pf-unit").value, price: g("#pf-price").value, stock: g("#pf-stock").value, emoji: g("#pf-emoji").value, description: g("#pf-desc").value, active: g("#pf-active").checked }), "Product saved.").then(function (r) { return r ? undefined : false; });
        } }] });
    }
    root.querySelector("#add-product").addEventListener("click", function () { form(); });
    root.addEventListener("click", function (e) {
      var ed = e.target.closest("[data-edit]"), tg = e.target.closest("[data-toggle]");
      if (ed) form(A.byId(snap.products, ed.dataset.edit));
      if (tg) { var p = A.byId(snap.products, tg.dataset.toggle); HB.confirm((p.active ? "Deactivate " : "Activate ") + esc(p.name) + "? " + (p.active ? "Customers will no longer see it." : "Customers will see it again."), { confirmLabel: p.active ? "Deactivate" : "Activate", danger: p.active }).then(function (ok) { if (ok) { p.active = !p.active; A.act(HB.api.saveProduct(p), "Product updated."); } }); }
    });
  } };

  /* ---------- reports ---------- */
  function bars(items, fmtFn) {
    var max = Math.max.apply(null, items.map(function (i) { return i[1]; }).concat([1]));
    return '<ul class="bars">' + items.map(function (i) { return '<li><span class="bar-label">' + esc(i[0]) + '</span><span class="bar"><span style="width:' + Math.round(i[1] / max * 100) + '%"></span></span><span class="bar-val">' + (fmtFn ? fmtFn(i[1]) : i[1]) + "</span></li>"; }).join("") + "</ul>";
  }
  A.sections.reports = { label: "Reports", render: function (root, snap) {
    var live = snap.orders.filter(function (o) { return o.status !== "Cancelled"; });
    var byStatus = HB.ORDER_STAGES.concat(["Cancelled"]).map(function (s) { return [s.replace("Awaiting Availability/Price Confirmation", "Awaiting confirmation"), snap.orders.filter(function (o) { return o.status === s; }).length]; });
    var days = [], i;
    for (i = 6; i >= 0; i--) { var dt = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); days.push([dt.slice(5), live.filter(function (o) { return o.createdAt.slice(0, 10) === dt; }).reduce(function (s, o) { return s + A.orderTotal(o); }, 0)]); }
    var qty = {}; live.forEach(function (o) { o.lines.forEach(function (l) { qty[l.name] = (qty[l.name] || 0) + l.qty; }); });
    var top = Object.keys(qty).map(function (k) { return [k, qty[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    var gm = 0, rev = 0; live.forEach(function (o) { o.lines.forEach(function (l) { var sid = snap.preferred[l.productId], c = sid ? A.cost(snap, sid, l.productId) : null; if (c !== null) { gm += (l.unitPrice - c) * l.qty; rev += l.unitPrice * l.qty; } }); });
    function count(arr, key, vals) { return vals.map(function (v) { return [v, arr.filter(function (x) { return x[key] === v; }).length]; }); }
    root.innerHTML = '<div class="dash-head"><h1>Reports</h1></div><p class="note">Figures come from the records stored in this browser. They are estimates, not accounting records.</p><div class="report-grid">' +
      '<section class="form-card"><h2>Orders by status</h2>' + bars(byStatus) + '</section><section class="form-card"><h2>Estimated sales, last 7 days</h2>' + bars(days, fmt) + '</section><section class="form-card"><h2>Top products by quantity</h2>' + (top.length ? bars(top) : "<p class=\"muted\">No data.</p>") + "</section>" +
      '<section class="form-card"><h2>Indicative margin (admin only)</h2><p class="stat-value">' + (rev ? Math.round(gm / rev * 100) + "%" : "-") + '</p><p class="muted">' + fmt(gm) + " on " + fmt(rev) + " of item sales, using each product's preferred supplier cost.</p></section>" +
      '<section class="form-card"><h2>Sourcing requests</h2>' + bars(count(snap.sourcing, "status", HB.SR_STATUSES)) + '</section><section class="form-card"><h2>Deliveries</h2>' + bars(count(snap.deliveries, "status", HB.DELIVERY_STATUSES)) + '</section><section class="form-card"><h2>Supplier notifications</h2>' + bars(["Queued", "Failed", "Awaiting Integration"].map(function (s) { return [s, snap.notifications.filter(function (n) { return n.direction === "outbound" && n.status === s; }).length]; })) + "</section></div>";
  } };

  /* ---------- shell ---------- */
  A.render = function () {
    var root = document.getElementById("admin-root"); if (!root) return;
    var parts = (location.hash || "#overview").slice(1).split("/"), key = A.sections[parts[0]] ? parts[0] : "overview";
    var nav = document.getElementById("admin-nav");
    nav.innerHTML = A.ORDER.filter(function (k) { return A.sections[k]; }).map(function (k) { return '<a href="#' + k + '"' + (k === key ? ' aria-current="page"' : "") + ">" + A.sections[k].label + "</a>"; }).join("");
    var fresh = root.cloneNode(false); root.parentNode.replaceChild(fresh, root);   /* drops old listeners */
    A.sections[key].render(fresh, A.snap, parts.slice(1).join("/"));
  };
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("admin-root")) return;
    window.addEventListener("hashchange", function () { if (A.snap) { A.render(); window.scrollTo(0, 0); } });
    A.refresh();
    window.addEventListener("hb:state-change", function () { /* another call already refreshes; this keeps the Reset button working */ });
    document.addEventListener("click", function (e) { if (e.target.id === "reset-records") setTimeout(A.refresh, 300); });
  });
})();
