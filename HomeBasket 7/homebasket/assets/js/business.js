/* HomeBasket — business quotation requests (customer form) + admin "Quotations" section */
(function () {
  "use strict";
  var HB = window.HB, A = (HB.admin = HB.admin || { sections: {} });

  /* ---------- customer page ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("business-form"); if (!form) return;
    var picker = document.getElementById("item-picker"), filter = document.getElementById("item-filter"), doneBox = document.getElementById("quote-done");
    var products = [];
    form.elements.preferredDate.min = new Date().toISOString().slice(0, 10);
    var me = HB.session.current();   /* prefill contact details from the signed-in (demonstration) account */
    if (me) { form.elements.contact.value = me.name; form.elements.phone.value = me.phone || ""; }
    HB.data.zones.list().then(function (z) {
      form.elements.area.innerHTML = '<option value="">Select your area…</option>' + z.map(function (x) { return '<option value="' + HB.escapeHtml(x.name) + '">' + HB.escapeHtml(x.name) + "</option>"; }).join("");
    });
    HB.data.products.list().then(function (list) { products = list.filter(function (p) { return p.stock !== "out_of_stock"; }); drawPicker(""); });
    var picked = {};
    function drawPicker(q) {
      q = q.toLowerCase();
      picker.innerHTML = products.filter(function (p) { return !q || (p.name + " " + p.unit).toLowerCase().indexOf(q) > -1; }).map(function (p) {
        var on = picked[p.id] !== undefined;
        return '<div class="pick-row"><label><input type="checkbox" data-id="' + p.id + '"' + (on ? " checked" : "") + "> " + HB.escapeHtml(p.name) + ' <small class="muted">' + HB.escapeHtml(p.unit) + " · " + HB.formatNaira(p.price) + "</small></label>" +
          '<input type="number" class="qty-input pick-qty" min="1" max="999" value="' + (on ? (isNaN(picked[p.id]) ? "" : picked[p.id]) : 1) + '" aria-label="Quantity of ' + HB.escapeHtml(p.name) + '"' + (on ? "" : " disabled") + "></div>";
      }).join("") || '<p class="muted">No matching products.</p>';
    }
    filter.addEventListener("input", function () { drawPicker(filter.value.trim()); });
    picker.addEventListener("change", function (e) {
      var row = e.target.closest(".pick-row"); if (!row) return;
      var cb = row.querySelector('input[type="checkbox"]'), qty = row.querySelector(".pick-qty"), id = cb.dataset.id;
      if (e.target === cb) { qty.disabled = !cb.checked; if (cb.checked) picked[id] = parseInt(qty.value, 10); else delete picked[id]; }
      else if (cb.checked) picked[id] = parseInt(qty.value, 10);
    });
    var rules = {
      businessName: function (v) { return v.length < 2 ? "Enter your business name." : ""; },
      contact: function (v) { return v.length < 2 ? "Enter a contact person." : ""; },
      phone: function (v) { return HB.normalizeNgPhone(v) ? "" : "Enter a valid Nigerian number, e.g. 0803 123 4567."; },
      area: function (v) { return v ? "" : "Choose your delivery area."; },
      category: function (v) { return v ? "" : "Choose your business category."; },
      deliveryAddress: function (v) { return v.length < 8 ? "Enter your full delivery address, with a landmark if possible." : ""; },
      preferredDate: function (v) { return !v || v >= new Date().toISOString().slice(0, 10) ? "" : "Choose today or a later date."; },
      requirements: function (v) { return (v.length >= 5 || Object.keys(picked).length) ? "" : "Describe what you need, or select products below."; }
    };
    function setError(f, m) { document.getElementById("err-" + f).textContent = m; form.elements[f].setAttribute("aria-invalid", m ? "true" : "false"); }
    var review = document.getElementById("quote-review"), draft = null;
    function itemsOk() {
      var ids = Object.keys(picked), bad = ids.some(function (id) { var q = picked[id]; return !(Number.isInteger(q) && q >= 1 && q <= 999); });
      document.getElementById("err-items").textContent = bad ? "Enter whole-number quantities from 1 to 999 for every selected product." : "";
      return !bad;
    }
    function money(n) { return HB.formatNaira(n); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      Object.keys(rules).forEach(function (f) { var m = rules[f](form.elements[f].value.trim()); setError(f, m); if (m && !first) first = form.elements[f]; });
      if (!itemsOk() && !first) first = picker.querySelector(".pick-qty:not(:disabled)") || picker;
      if (first) { first.focus(); return; }
      var items = Object.keys(picked).map(function (id) { return { productId: id, qty: picked[id] }; });
      draft = {
        businessName: form.elements.businessName.value.trim(), contact: form.elements.contact.value.trim(), phone: form.elements.phone.value, area: form.elements.area.value,
        category: form.elements.category.value, deliveryAddress: form.elements.deliveryAddress.value.trim(), preferredDate: form.elements.preferredDate.value,
        requirements: form.elements.requirements.value, frequency: form.elements.frequency.value, notes: form.elements.notes.value, items: items
      };
      var rows = items.map(function (i) {
        var p = HB.getProduct(i.productId); if (!p) return "";
        return "<tr><td>" + HB.escapeHtml(p.name) + '<br><small class="muted">' + HB.escapeHtml(p.unit) + "</small></td><td>" + i.qty + "</td><td>" + money(p.price) + "</td><td>" + money(p.price * i.qty) + "</td></tr>";
      }).join("");
      var total = items.reduce(function (t, i) { var p = HB.getProduct(i.productId); return t + (p ? p.price * i.qty : 0); }, 0);
      var d = function (k, v) { return "<div><dt>" + k + "</dt><dd>" + HB.escapeHtml(v || "-") + "</dd></div>"; };
      document.getElementById("review-body").innerHTML = '<dl class="review-list">' + d("Business", draft.businessName) + d("Category", draft.category) + d("Contact person", draft.contact) + d("Phone", HB.normalizeNgPhone(draft.phone)) +
        d("Delivery area", draft.area) + d("Delivery address", draft.deliveryAddress) + d("Preferred delivery date", draft.preferredDate || "Flexible") + d("How often", draft.frequency) + d("Requirements", draft.requirements) + d("Additional instructions", draft.notes) + "</dl>" +
        (rows ? '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Indicative price</th><th>Total</th></tr></thead><tbody>' + rows + "</tbody></table></div><p><strong>Indicative items total: " + money(total) + "</strong> (excluding delivery)</p>" : "<p>No products selected. We will work from your written requirements.</p>");
      form.hidden = true; review.hidden = false;
      document.getElementById("review-heading").focus(); window.scrollTo(0, 0);
    });
    document.getElementById("review-edit").addEventListener("click", function () { review.hidden = true; form.hidden = false; form.elements.businessName.focus(); });
    document.getElementById("review-confirm").addEventListener("click", function () {
      if (!draft) return;
      var btn = document.getElementById("review-confirm"); btn.disabled = true; btn.textContent = "Submitting…";
      HB.data.quotations.submitBusinessRequest(draft).then(function (bq) { review.hidden = true; show(bq); }, function (err) {
        HB.toast(HB.errMsg(err), "error"); btn.disabled = false; btn.textContent = "Request Quotation";
      });
    });
    function show(bq) {
      form.hidden = true; doneBox.hidden = false;
      var rows = bq.items.map(function (l) { return "<tr><td>" + HB.escapeHtml(l.name) + '<br><small class="muted">' + HB.escapeHtml(l.unit) + "</small></td><td>" + l.qty + "</td><td>" + HB.formatNaira(l.unitPrice) + "</td><td>" + HB.formatNaira(l.qty * l.unitPrice) + "</td></tr>"; }).join("");
      document.getElementById("quote-ref").textContent = bq.id;
      document.getElementById("quote-summary").innerHTML = (rows ? '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + rows +
        '</tbody></table></div><p><strong>Indicative items total: ' + HB.formatNaira(bq.indicativeSubtotal) + "</strong> (excluding delivery)</p>" : "<p>No products were selected. We will work from your written requirements.</p>") +
        '<dl class="review-list">' + [["Business", bq.businessName], ["Category", bq.category], ["Contact person", bq.contact], ["Phone", bq.phone], ["Delivery area", bq.area], ["Delivery address", bq.deliveryAddress], ["Preferred delivery date", bq.preferredDate || "Flexible"], ["How often", bq.frequency], ["Requirements", bq.requirements], ["Additional instructions", bq.notes]]
          .map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + HB.escapeHtml(r[1] || "-") + "</dd></div>"; }).join("") + "</dl>";
      var msg = ["HOME BASKET — BUSINESS QUOTATION REQUEST", "Reference: " + bq.id, "", "Business: " + bq.businessName, "Category: " + (bq.category || "-"), "Contact: " + bq.contact, "Phone: " + bq.phone, "Delivery area: " + bq.area, "Delivery address: " + (bq.deliveryAddress || "-"), "Preferred delivery date: " + (bq.preferredDate || "Flexible"), "Frequency: " + bq.frequency, "",
        "Requirements: " + (bq.requirements || "See items"), "", bq.items.length ? "ITEMS\n" + bq.items.map(function (l, i) { return (i + 1) + ". " + l.name + " (" + l.unit + ") × " + l.qty; }).join("\n") : "", "",
        "Additional instructions: " + (bq.notes || "None"), "", "This is a quotation request. Please check availability and confirm my quotation."].join("\n");
      document.getElementById("quote-wa").addEventListener("click", function () { HB.openWhatsApp(msg); });
      document.getElementById("quote-heading").focus(); window.scrollTo(0, 0);
    }
  });

  /* ---------- admin: Quotations section ---------- */
  A.sections.quotes = { label: "Quotations", render: function (root, snap) {
    var bq = snap.businessQuotes.map(function (b) {
      var link = HB.waLinkTo(b.phone, "Hello " + b.contact + ", this is HomeBasket about your quotation request " + b.id + ".");
      return "<tr><td>" + b.id + "</td><td><strong>" + HB.escapeHtml(b.businessName) + "</strong><br><small class=\"muted\">" + HB.escapeHtml(b.contact) + " · " + HB.escapeHtml(b.phone) + "</small>" + (b.category ? "<br><small class=\"muted\">" + HB.escapeHtml(b.category) + "</small>" : "") + "</td><td>" + HB.escapeHtml(b.area) + (b.deliveryAddress ? "<br><small class=\"muted\">" + HB.escapeHtml(b.deliveryAddress) + "</small>" : "") + "</td>" +
        "<td>" + HB.escapeHtml(b.frequency) + (b.preferredDate ? " · by " + HB.escapeHtml(b.preferredDate) : "") + "<br><small class=\"muted\">" + HB.escapeHtml(b.requirements || "") + "</small></td><td>" + (b.items.length ? b.items.length + " item(s)<br>" + HB.formatNaira(b.indicativeSubtotal) : "-") + "</td>" +
        '<td><label class="sr-only" for="bq-' + b.id + '">Status</label><select id="bq-' + b.id + '" data-bq="' + b.id + '">' + HB.BQ_STATUSES.map(function (s) { return "<option" + (s === b.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></td>" +
        "<td>" + (b.sample ? HB.badge("Sample record") : "") + (link ? ' <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + link + '">Message</a>' : "") + "</td></tr>";
    }).join("");
    var qs = snap.quotations.map(function (q) {
      return "<tr><td>" + q.id + '</td><td><a href="#orders/' + q.orderRef + '">' + q.orderRef + "</a></td><td>" + HB.badge(q.status) + "</td><td>" + HB.formatNaira(q.total) + '<br><small class="muted">Customer saw ' + HB.formatNaira(q.originalTotal) + "</small></td>" +
        "<td>" + (q.requiresApproval ? "Yes" : "No") + "</td><td>" + HB.formatDateTime(q.createdAt) + "</td><td>" + HB.formatDateTime(q.expiresAt) + "</td></tr>";
    }).join("");
    root.innerHTML = '<div class="dash-head"><h1>Quotations</h1></div><section class="form-card"><h2>Business quotation requests</h2>' +
      (bq ? '<div class="table-wrap"><table class="table"><thead><tr><th>Ref</th><th>Business</th><th>Area</th><th>Needs</th><th>Items (indicative)</th><th>Status</th><th></th></tr></thead><tbody>' + bq + "</tbody></table></div>" : '<p class="muted">No requests yet.</p>') +
      '<p class="note">Recurring restocking is stored as an enquiry only. There is no subscription system.</p></section>' +
      '<section class="form-card"><h2>Final quotations for customer orders</h2>' + (qs ? '<div class="table-wrap"><table class="table"><thead><tr><th>Quotation</th><th>Order</th><th>Status</th><th>Total</th><th>Needs approval</th><th>Created</th><th>Expires</th></tr></thead><tbody>' + qs + "</tbody></table></div>" : '<p class="muted">No quotations yet. Prepare one from an order.</p>') + "</section>";
    root.querySelectorAll("[data-bq]").forEach(function (s) { s.addEventListener("change", function () { A.act(HB.api.updateBusinessQuoteStatus(s.dataset.bq, s.value), "Status updated."); }); });
  } };
})();
