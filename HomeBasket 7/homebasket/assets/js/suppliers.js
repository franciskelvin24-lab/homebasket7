/* ==========================================================================
   HomeBasket — suppliers: admin Suppliers + Sourcing sections, and the
   supplier area (no login yet). In production, a supplier must only be
   able to fetch their own requests, enforced by the backend.
   ========================================================================== */
(function () {
  "use strict";
  var HB = window.HB, A = (HB.admin = HB.admin || { sections: {} });
  var esc = HB.escapeHtml, fmt = HB.formatNaira;
  var CHANNELS = ["whatsapp", "sms", "email"];
  var AVAIL = { available: "Available", low: "Low stock", unavailable: "Unavailable" };
  function byId(arr, id, key) { key = key || "id"; for (var i = 0; i < arr.length; i++) if (arr[i][key] === id) return arr[i]; return null; }
  function ago(iso) { var d = HB.daysAgo(iso); return d <= 0 ? "today" : d + "d ago"; }

  /* ================= ADMIN: SUPPLIERS ================= */
  function supplierForm(s) {
    s = s || { name: "", contact: "", phone: "", area: "", categories: [], status: "Pending Review", channel: "whatsapp", verifiedContact: false };
    HB.modal({ title: s.id ? "Edit supplier" : "Add supplier", wide: true, body:
      '<div class="field"><label for="sf-name">Business name</label><input id="sf-name" value="' + esc(s.name) + '"></div><div class="field"><label for="sf-contact">Contact person</label><input id="sf-contact" value="' + esc(s.contact) + '"></div>' +
      '<div class="field"><label for="sf-phone">Phone</label><input id="sf-phone" type="tel" value="' + esc(s.phone) + '"></div><div class="field"><label for="sf-area">Address / service area</label><input id="sf-area" value="' + esc(s.area) + '"></div>' +
      '<fieldset class="field"><legend>Product categories</legend>' + window.HB_CATEGORIES.map(function (c) { return '<label class="check-row"><input type="checkbox" name="sf-cat" value="' + c.id + '"' + (s.categories.indexOf(c.id) > -1 ? " checked" : "") + "> " + esc(c.name) + "</label>"; }).join("") + "</fieldset>" +
      '<div class="field"><label for="sf-channel">Preferred notification channel</label><select id="sf-channel">' + CHANNELS.map(function (c) { return "<option" + (c === s.channel ? " selected" : "") + ">" + c + "</option>"; }).join("") + '</select></div>' +
      '<label class="check-row"><input type="checkbox" id="sf-verified"' + (s.verifiedContact ? " checked" : "") + "> Contact details verified</label>" +
      '<div class="field"><label for="sf-status">Status</label><select id="sf-status">' + HB.SUPPLIER_STATUSES.map(function (x) { return "<option" + (x === s.status ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></div>",
      actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save supplier", cls: "btn-primary", onClick: function (c) {
        var g = function (id) { return c.el.querySelector(id); };
        var rec = { id: s.id, name: g("#sf-name").value, contact: g("#sf-contact").value, phone: g("#sf-phone").value, area: g("#sf-area").value,
          categories: [].map.call(c.el.querySelectorAll('input[name="sf-cat"]:checked'), function (i) { return i.value; }), channel: g("#sf-channel").value, verifiedContact: g("#sf-verified").checked, status: g("#sf-status").value };
        var go = function () { return A.act(HB.api.saveSupplier(rec), "Supplier saved.").then(function (r) { return r ? undefined : false; }); };
        if (rec.status === "Suspended" && s.status !== "Suspended") return HB.confirm("Suspend " + esc(rec.name) + "? It can no longer be selected or receive requests.", { title: "Suspend supplier", confirmLabel: "Suspend", danger: true }).then(function (ok) { return ok ? go() : false; });
        return go();
      } }] });
  }
  function costsModal(supplierId) {
    var ctl = HB.modal({ title: "Products and costs", wide: true, body: '<div id="costs-body"></div>', actions: [{ label: "Close", cls: "btn-outline" }] });
    var body = ctl.el.querySelector("#costs-body");
    function draw() {
      var snap = A.snap, sup = byId(snap.suppliers, supplierId);
      var mine = snap.supplierProducts.filter(function (sp) { return sp.supplierId === supplierId; });
      var rows = mine.map(function (sp) {
        var p = byId(snap.products, sp.productId);
        return '<tr data-pid="' + sp.productId + '"><td>' + esc(p.name) + '<br><small class="muted">' + esc(p.unit) + " · selling " + fmt(p.price) + '</small></td><td><input type="number" class="c-cost" min="0" step="50" value="' + sp.cost + '" aria-label="Cost"></td><td><select class="c-av" aria-label="Availability">' +
          Object.keys(AVAIL).map(function (k) { return '<option value="' + k + '"' + (k === sp.availability ? " selected" : "") + ">" + AVAIL[k] + "</option>"; }).join("") + "</select></td><td" + (HB.daysAgo(sp.updatedAt) >= 3 ? ' class="stale"' : "") + ">" + ago(sp.updatedAt) +
          '</td><td><button type="button" class="btn btn-outline btn-sm" data-save>Save</button> <button type="button" class="btn btn-ghost btn-sm" data-remove>Remove</button></td></tr>';
      }).join("");
      var avail = snap.products.filter(function (p) { return !byId(mine, p.id, "productId"); });
      body.innerHTML = "<p><strong>" + esc(sup.name) + "</strong> " + HB.badge(sup.status) + '</p><p class="note">Costs are internal and never shown to customers. Costs older than 3 days are highlighted because prices may have changed.</p>' +
        A.table(["Product", "Unit cost (₦)", "Availability", "Last updated", ""], rows, "No products assigned yet.") +
        '<h3>Add a product</h3><div class="filters"><div class="field"><label for="add-prod">Product</label><select id="add-prod">' + avail.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + " (" + esc(p.unit) + ")</option>"; }).join("") + '</select></div><div class="field"><label for="add-cost">Unit cost (₦)</label><input id="add-cost" type="number" min="0" step="50"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-primary" data-add' + (avail.length ? "" : " disabled") + ">Add</button></div></div>";
    }
    draw();
    body.addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-pid]");
      if (e.target.closest("[data-save]")) A.act(HB.api.saveSupplierProduct(supplierId, tr.dataset.pid, { cost: tr.querySelector(".c-cost").value, availability: tr.querySelector(".c-av").value }), "Saved.").then(draw);
      else if (e.target.closest("[data-remove]")) HB.confirm("Remove this product from the supplier?", { confirmLabel: "Remove", danger: true }).then(function (ok) { if (ok) A.act(HB.api.removeSupplierProduct(supplierId, tr.dataset.pid), "Removed.").then(draw); });
      else if (e.target.closest("[data-add]")) {
        var cost = body.querySelector("#add-cost").value; if (cost === "") { HB.toast("Enter a unit cost.", "error"); return; }
        A.act(HB.api.saveSupplierProduct(supplierId, body.querySelector("#add-prod").value, { cost: cost }), "Product added.").then(draw);
      }
    });
  }

  A.sections.suppliers = { label: "Suppliers", render: function (root, snap) {
    var rows = snap.suppliers.map(function (s) {
      var n = snap.supplierProducts.filter(function (sp) { return sp.supplierId === s.id; }).length;
      return "<tr><td><strong>" + esc(s.name) + "</strong><br><small class=\"muted\">" + esc(s.contact) + " · " + esc(s.phone) + "</small></td><td>" + HB.badge(s.status) + "</td><td>" + esc(s.channel) + "<br>" + HB.badge(s.verifiedContact ? "Verified" : "Unverified") + "</td><td>" +
        s.categories.map(function (c) { var k = HB.getCategory(c); return esc(k ? k.name : c); }).join(", ") + "</td><td>" + n + '</td><td><button type="button" class="btn btn-ghost btn-sm" data-edit="' + s.id + '">Edit</button> <button type="button" class="btn btn-outline btn-sm" data-costs="' + s.id + '">Products &amp; costs</button></td></tr>';
    }).join("");
    var heads = snap.suppliers.map(function (s) { return "<th>" + esc(s.name) + "<br>" + HB.badge(s.status) + "</th>"; }).join("");
    var u = A.ui.compare = A.ui.compare || { q: "", cat: "" };
    root.innerHTML = '<div class="dash-head"><h1>Suppliers</h1><button type="button" class="btn btn-primary" id="add-sup">Add supplier</button></div>' +
      '<section class="form-card"><p class="note">Supplier details, costs and comparisons are admin-only. Customers only ever see the HomeBasket selling price. Replace the generic supplier names with your real suppliers.</p>' + A.table(["Supplier", "Status", "Channel", "Categories", "Products", ""], rows) + "</section>" +
      '<section class="form-card"><h2>Internal price comparison and preferred supplier</h2><div class="filters"><div class="field"><label for="cmp-q">Search product</label><input id="cmp-q" type="search" value="' + esc(u.q) + '"></div><div class="field"><label for="cmp-cat">Category</label><select id="cmp-cat"><option value="">All</option>' +
      window.HB_CATEGORIES.map(function (c) { return '<option value="' + c.id + '"' + (u.cat === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></div></div><p class="note">Lowest cost is marked ★. Costs 3+ days old are highlighted: they may have changed. A supplier that is not Approved should be reviewed before use.</p><div id="cmp-table"></div></section>';
    function drawCompare() {
      var q = u.q.toLowerCase();
      var rows2 = snap.products.filter(function (p) { return (!u.cat || p.category === u.cat) && (!q || (p.name + " " + p.unit).toLowerCase().indexOf(q) > -1); }).map(function (p) {
        var sps = snap.supplierProducts.filter(function (sp) { return sp.productId === p.id; }), min = Math.min.apply(null, sps.map(function (x) { return x.cost; }));
        var cells = snap.suppliers.map(function (s) {
          var sp = byId(sps, s.id, "supplierId"); if (!sp) return '<td class="muted">-</td>';
          return "<td" + (HB.daysAgo(sp.updatedAt) >= 3 ? ' class="stale"' : "") + ">" + fmt(sp.cost) + (sp.cost === min && sps.length > 1 ? " ★" : "") + '<br><small class="muted">' + AVAIL[sp.availability] + " · " + ago(sp.updatedAt) + "</small></td>";
        }).join("");
        var opts = sps.map(function (sp) { var s = byId(snap.suppliers, sp.supplierId); return '<option value="' + s.id + '"' + (snap.preferred[p.id] === s.id ? " selected" : "") + (s.status === "Suspended" ? " disabled" : "") + ">" + esc(s.name) + "</option>"; }).join("");
        return "<tr><td><strong>" + esc(p.name) + '</strong><br><small class="muted">' + esc(p.unit) + " · selling " + fmt(p.price) + "</small></td>" + cells + '<td><label class="sr-only" for="pf-' + p.id + '">Preferred supplier for ' + esc(p.name) + '</label><select id="pf-' + p.id + '" data-pref="' + p.id + '"><option value="">None</option>' + opts + "</select></td></tr>";
      }).join("");
      root.querySelector("#cmp-table").innerHTML = A.table(["Product"].concat(snap.suppliers.map(function (s, i) { return heads.split("</th>")[i].replace("<th>", ""); }), ["Preferred"]), rows2, "No products match.");
    }
    drawCompare();
    root.querySelector("#cmp-q").addEventListener("input", function (e) { u.q = e.target.value.trim(); drawCompare(); });
    root.querySelector("#cmp-cat").addEventListener("change", function (e) { u.cat = e.target.value; drawCompare(); });
    root.querySelector("#add-sup").addEventListener("click", function () { supplierForm(); });
    root.addEventListener("click", function (e) {
      var ed = e.target.closest("[data-edit]"), co = e.target.closest("[data-costs]");
      if (ed) supplierForm(byId(snap.suppliers, ed.dataset.edit)); if (co) costsModal(co.dataset.costs);
    });
    root.addEventListener("change", function (e) {
      var sel = e.target.closest("[data-pref]"); if (!sel) return;
      HB.run(HB.api.setPreferredSupplier(sel.dataset.pref, sel.value), "Preferred supplier updated.").then(function (r) { if (r.warning) HB.toast(r.warning, "error"); return A.refresh(); }, function () { return A.refresh(); });
    });
  } };

  /* ================= ADMIN: SOURCING + NOTIFICATIONS ================= */
  function srModal(sr, snap) {
    var rows = sr.lines.map(function (l) {
      var rl = sr.response ? byId(sr.response.lines, l.productId, "productId") : null;
      var diff = rl && (rl.proposedUnitCost > l.indicativeCost || rl.proposedQty < l.qty);
      return "<tr><td>" + esc(l.name) + '<br><small class="muted">' + esc(l.unit) + "</small></td><td>" + l.qty + "</td><td>" + fmt(l.indicativeCost) + "</td><td>" + (rl ? rl.proposedQty : "-") + "</td><td" + (diff ? ' class="stale"' : "") + ">" + (rl ? fmt(rl.proposedUnitCost) : "-") + "</td></tr>";
    }).join("");
    HB.modal({ title: sr.ref, wide: true, body: "<p>" + HB.badge(sr.status) + " " + HB.badge(sr.notificationStatus || "No notification") + "</p><p>Supplier: <strong>" + esc(A.supplierName(snap, sr.supplierId)) + "</strong><br>Order: <a href=\"#orders/" + sr.orderRef + '">' + sr.orderRef + "</a> · Requested fulfilment date: " + esc(sr.requestedDate) + "</p>" +
      A.table(["Item", "Qty wanted", "Indicative cost", "Supplier qty", "Supplier cost"], rows) + (sr.response && sr.response.note ? "<p><strong>Supplier note:</strong> " + esc(sr.response.note) + "</p>" : "") +
      '<p class="note">Highlighted cells differ from the indicative cost or quantity. Review before preparing the final quotation.</p><details><summary>History</summary><ul class="activity">' + sr.history.map(function (h) { return "<li>" + esc(h.status) + ' <small class="muted">' + HB.formatDateTime(h.at) + "</small></li>"; }).join("") + "</ul></details>",
      actions: [{ label: "Close", cls: "btn-outline" }] });
  }
  A.sections.sourcing = { label: "Sourcing", render: function (root, snap) {
    var rows = snap.sourcing.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).map(function (s) {
      var resp = s.response ? (s.response.decision === "declined" ? "Declined" : "Offer received") : "Awaiting reply";
      return "<tr><td><strong>" + s.ref + '</strong></td><td><a href="#orders/' + s.orderRef + '">' + s.orderRef + "</a></td><td>" + esc(A.supplierName(snap, s.supplierId)) + "</td><td>" + s.lines.map(function (l) { return l.qty + " × " + esc(l.name); }).join("<br>") + "</td><td>" + esc(s.requestedDate) + "</td><td>" + HB.badge(s.status) + "</td><td>" + resp + "</td><td>" + HB.badge(s.notificationStatus || "None") +
        '</td><td><button type="button" class="btn btn-ghost btn-sm" data-view="' + s.ref + '">Review</button></td></tr>';
    }).join("");
    var log = snap.notifications.map(function (n) { n.supplierName = A.supplierName(snap, n.supplierId); return n; });
    root.innerHTML = '<div class="dash-head"><h1>Sourcing and notifications</h1></div><section class="form-card"><h2>Sourcing requests</h2><p class="note">Each request contains only one supplier\'s items. It never includes the customer\'s name, address or the full order.</p>' +
      A.table(["Request", "Order", "Supplier", "Items", "Needed by", "Status", "Supplier reply", "Notification", ""], rows, "No sourcing requests yet.") + '</section><section class="form-card"><h2>Notification log</h2><div class="alert alert-info">Messaging is <strong>not yet connected</strong>. Entries are queued records, not sent messages. Nothing reaches a supplier until a WhatsApp Business Platform, SMS or email provider is connected through a backend. Use “Contact manually” meanwhile.</div><div id="notif-log">' + HB.notificationLogHtml(log) + "</div></section>";
    root.addEventListener("click", function (e) {
      var v = e.target.closest("[data-view]"); if (v) return srModal(byId(snap.sourcing, v.dataset.view, "ref"), snap);
      var b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "retry") A.act(HB.api.retrySupplierNotification(b.dataset.sr), "Notification re-queued.");
      else if (b.dataset.act === "view-msg") { var n = byId(snap.notifications, b.dataset.id); HB.modal({ title: "Message " + n.id, body: "<p>" + HB.badge(n.status) + " " + esc(n.channel) + '</p><pre class="msg-preview">' + esc(n.message) + "</pre><p class=\"note\">" + esc(n.note) + "</p>", actions: [{ label: "Close", cls: "btn-outline" }] }); }
      else if (b.dataset.act === "manual") {
        var sr = byId(snap.sourcing, b.dataset.sr, "ref"), sup = byId(snap.suppliers, sr.supplierId), norm = HB.normalizeNgPhone(sup.phone);
        if (!norm) { HB.toast("This supplier's phone number is not a valid Nigerian number. Edit the supplier first.", "error"); return; }
        var link = HB.waLinkTo(norm, "Hello, this is HomeBasket. Request " + sr.ref + ":\n" + sr.lines.map(function (l) { return "- " + l.qty + " x " + l.name + " (" + l.unit + ")"; }).join("\n") + "\nPlease confirm availability and your price. Needed by " + sr.requestedDate + ".");
        window.open(link, "_blank", "noopener");
        HB.toast("Opened a chat draft. It is not sent until you press send in WhatsApp.");
      }
    });
  } };

  /* ================= SUPPLIER AREA ================= */
  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("supplier-root"); if (!root) return;
    var supplierId = null;
    function draw() {
      HB.api.getSnapshot().then(function (snap) {
        if (!supplierId) supplierId = snap.suppliers[0].id;
        var sup = byId(snap.suppliers, supplierId);
        var mine = snap.sourcing.filter(function (s) { return s.supplierId === supplierId; }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
        var incoming = mine.filter(function (s) { return s.status === "New Request"; });
        var active = mine.filter(function (s) { return ["Accepted", "Preparing", "Ready for Collection"].indexOf(s.status) > -1; });
        var past = mine.filter(function (s) { return s.status === "Collected" || s.status === "Declined"; });
        var next = { "Accepted": "Preparing", "Preparing": "Ready for Collection", "Ready for Collection": "Collected" };
        var products = snap.supplierProducts.filter(function (sp) { return sp.supplierId === supplierId; });

        var incHtml = incoming.map(function (s) {
          return '<article class="req-card" data-ref="' + s.ref + '"><h3>' + s.ref + " " + HB.badge(s.status) + '</h3><p class="muted">Requested fulfilment date: ' + esc(s.requestedDate) + '</p><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty wanted</th><th>Indicative cost</th><th>Your qty</th><th>Your unit cost (₦)</th></tr></thead><tbody>' +
            s.lines.map(function (l) { return '<tr data-pid="' + l.productId + '"><td>' + esc(l.name) + '<br><small class="muted">' + esc(l.unit) + "</small></td><td>" + l.qty + "</td><td>" + fmt(l.indicativeCost) + '</td><td><input type="number" class="r-qty" min="0" value="' + l.qty + '" aria-label="Your quantity for ' + esc(l.name) + '"></td><td><input type="number" class="r-cost" min="0" step="50" value="' + l.indicativeCost + '" aria-label="Your unit cost for ' + esc(l.name) + '"></td></tr>'; }).join("") +
            '</tbody></table></div><div class="field"><label for="n-' + s.ref + '">Note to HomeBasket (optional)</label><input id="n-' + s.ref + '" class="r-note" maxlength="300"></div><div class="btn-row"><button type="button" class="btn btn-primary" data-accept>Accept request</button> <button type="button" class="btn btn-outline" data-decline>Decline</button></div></article>';
        }).join("");
        var actHtml = active.map(function (s) {
          return '<article class="req-card" data-ref="' + s.ref + '"><h3>' + s.ref + " " + HB.badge(s.status) + '</h3><p class="muted">Needed by ' + esc(s.requestedDate) + "</p><ul>" + s.lines.map(function (l) { return "<li>" + l.qty + " × " + esc(l.name) + " (" + esc(l.unit) + ")</li>"; }).join("") + '</ul><button type="button" class="btn btn-primary btn-sm" data-next="' + next[s.status] + '">Mark ' + next[s.status] + "</button></article>";
        }).join("");
        var prodHtml = products.map(function (sp) {
          var p = byId(snap.products, sp.productId);
          return '<tr data-pid="' + sp.productId + '"><td>' + esc(p.name) + '<br><small class="muted">' + esc(p.unit) + '</small></td><td><input type="number" class="p-cost" min="0" step="50" value="' + sp.cost + '" aria-label="Unit cost"></td><td><select class="p-av" aria-label="Availability">' + Object.keys(AVAIL).map(function (k) { return '<option value="' + k + '"' + (k === sp.availability ? " selected" : "") + ">" + AVAIL[k] + "</option>"; }).join("") + "</select></td><td>" + ago(sp.updatedAt) + '</td><td><button type="button" class="btn btn-outline btn-sm" data-psave>Update</button></td></tr>';
        }).join("");
        root.innerHTML = '<div class="dash-head"><h1>Supplier area</h1></div><div class="alert alert-info">Supplier login is not yet enabled, so pick a supplier account below. Actions are saved in this browser only and <strong>do not message the supplier</strong>. Once login exists, each supplier will see only their own requests.</div>' +
          '<div class="field preview-as"><label for="view-as">Supplier account</label><select id="view-as">' + snap.suppliers.map(function (s) { return '<option value="' + s.id + '"' + (s.id === supplierId ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + "</select></div>" +
          '<section class="form-card"><h2>Profile</h2><dl class="review-list"><div><dt>Business</dt><dd>' + esc(sup.name) + "</dd></div><div><dt>Contact person</dt><dd>" + esc(sup.contact) + "</dd></div><div><dt>Phone</dt><dd>" + esc(sup.phone) + "</dd></div><div><dt>Address / service area</dt><dd>" + esc(sup.area) + "</dd></div><div><dt>Categories</dt><dd>" + sup.categories.map(function (c) { var k = HB.getCategory(c); return esc(k ? k.name : c); }).join(", ") + "</dd></div><div><dt>Verification status</dt><dd>" + HB.badge(sup.status) + " " + HB.badge(sup.verifiedContact ? "Verified" : "Unverified") + "</dd></div></dl></section>" +
          '<section class="form-card"><h2>Incoming sourcing requests (' + incoming.length + ")</h2>" + (incHtml || '<p class="muted">No new requests. New requests appear here when a customer order includes this supplier\'s products.</p>') + "</section>" +
          '<section class="form-card"><h2>Accepted requests in progress (' + active.length + ")</h2>" + (actHtml || '<p class="muted">Nothing in progress.</p>') + "</section>" +
          '<section class="form-card"><h2>Products supplied</h2><p class="note">Costs are indicative. Keep prices and stock up to date.</p>' + A.table(["Product", "Unit cost (₦)", "Availability", "Last updated", ""], prodHtml, "No products assigned.") + "</section>" +
          '<section class="form-card"><h2>Previous requests</h2>' + A.table(["Request", "Items", "Needed by", "Outcome"], past.map(function (s) { return "<tr><td>" + s.ref + "</td><td>" + s.lines.map(function (l) { return l.qty + " × " + esc(l.name); }).join("<br>") + "</td><td>" + esc(s.requestedDate) + "</td><td>" + HB.badge(s.status) + "</td></tr>"; }).join(""), "No previous requests.") + "</section>";
      });
    }
    root.addEventListener("change", function (e) { if (e.target.id === "view-as") { supplierId = e.target.value; draw(); } });
    root.addEventListener("click", function (e) {
      var card = e.target.closest(".req-card"), tr = e.target.closest("tr[data-pid]");
      function go(p, msg) { HB.run(p, msg).then(draw, function () {}); }
      if (e.target.closest("[data-accept]")) {
        var lines = [].map.call(card.querySelectorAll("tbody tr"), function (r) { return { productId: r.dataset.pid, proposedQty: r.querySelector(".r-qty").value, proposedUnitCost: r.querySelector(".r-cost").value }; });
        go(HB.api.updateSourcingRequest(card.dataset.ref, { status: "Accepted", response: { lines: lines, note: card.querySelector(".r-note").value } }), "Request accepted.");
      } else if (e.target.closest("[data-decline]")) {
        HB.confirm("Decline request " + card.dataset.ref + "?", { title: "Decline request", confirmLabel: "Decline", danger: true }).then(function (ok) { if (ok) go(HB.api.updateSourcingRequest(card.dataset.ref, { status: "Declined", response: { lines: [], note: card.querySelector(".r-note").value } }), "Request declined."); });
      } else if (e.target.closest("[data-next]")) go(HB.api.updateSourcingRequest(card.dataset.ref, { status: e.target.closest("[data-next]").dataset.next }), "Status updated.");
      else if (e.target.closest("[data-psave]")) go(HB.api.saveSupplierProduct(supplierId, tr.dataset.pid, { cost: tr.querySelector(".p-cost").value, availability: tr.querySelector(".p-av").value }), "Product updated.");
    });
    draw();
  });
})();
