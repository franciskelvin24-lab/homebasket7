/* ==========================================================================
   HomeBasket — deliveries: admin Deliveries section + delivery partner area.
   Statuses are entered by people; there is no live GPS or distance data.
   Partner login is not yet enabled, so the partner area uses an account picker.
   ========================================================================== */
(function () {
  "use strict";
  var HB = window.HB, A = (HB.admin = HB.admin || { sections: {} });
  var esc = HB.escapeHtml, fmt = HB.formatNaira;
  function byId(arr, id, key) { key = key || "id"; for (var i = 0; i < arr.length; i++) if (arr[i][key] === id) return arr[i]; return null; }

  /* ================= ADMIN: DELIVERIES ================= */
  function manageModal(d, snap) {
    var o = byId(snap.orders, d.orderRef, "ref");
    var partnerOpts = '<option value="">Unassigned</option>' + snap.partners.map(function (p) { return '<option value="' + p.id + '"' + (d.partnerId === p.id ? " selected" : "") + ">" + esc(p.name) + (p.available ? "" : " (unavailable)") + "</option>"; }).join("");
    HB.modal({ title: "Manage delivery for " + d.orderRef, wide: true, body:
      "<p>" + HB.badge(d.cancelled ? "Cancelled" : d.status) + (o.delayed ? " " + HB.badge("Delayed") : "") + " · " + esc(d.area) + '</p><div class="field"><label for="dm-partner">Delivery partner</label><select id="dm-partner">' + partnerOpts + "</select></div>" +
      '<div class="field"><label for="dm-status">Status</label><select id="dm-status">' + HB.DELIVERY_STATUSES.map(function (s) { return "<option" + (s === d.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="dm-cost">Actual delivery cost (₦)</label><input id="dm-cost" type="number" min="0" step="50" value="' + (d.actualCost !== null ? d.actualCost : "") + '"><p class="note">Estimated fee: ' + fmt(d.estFee) + ". Shown separately from the actual cost.</p></div>" +
      '<div class="field"><label for="dm-pod">Proof of delivery (note, e.g. who received it)</label><input id="dm-pod" maxlength="300" value="' + esc(d.pod || "") + '"><p class="note">Photo upload needs a backend and is not available yet.</p></div>' +
      '<div class="field"><label for="dm-note">Add a delivery note</label><textarea id="dm-note" rows="2"></textarea></div>' +
      (d.notes.length ? "<details><summary>Notes (" + d.notes.length + ')</summary><ul class="activity">' + d.notes.slice().reverse().map(function (n) { return "<li>" + esc(n.text) + ' <small class="muted">' + HB.formatDateTime(n.at) + "</small></li>"; }).join("") + "</ul></details>" : "") +
      '<details><summary>History</summary><ul class="activity">' + d.history.slice().reverse().map(function (h) { return "<li>" + esc(h.status) + ' <small class="muted">' + HB.formatDateTime(h.at) + (h.note ? " · " + esc(h.note) : "") + "</small></li>"; }).join("") + "</ul></details>",
      actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save changes", cls: "btn-primary", onClick: function (c) {
        var g = function (id) { return c.el.querySelector(id); };
        var partner = g("#dm-partner").value, status = g("#dm-status").value, note = g("#dm-note").value.trim();
        var chain = Promise.resolve();
        if (partner !== (d.partnerId || "")) chain = chain.then(function () { return HB.api.assignDelivery(d.id, partner); });
        if (status !== d.status) chain = chain.then(function () { return HB.api.updateDeliveryStatus(d.id, status, note); });
        chain = chain.then(function () { return HB.api.updateDeliveryDetails(d.id, { actualCost: g("#dm-cost").value, pod: g("#dm-pod").value, note: status !== d.status ? "" : note }); });
        return chain.then(function () { HB.toast("Delivery updated."); return A.refresh().then(function () { return undefined; }); }, function (e) { HB.toast(HB.errMsg(e), "error"); return A.refresh().then(function () { return false; }); });
      } }] });
  }

  A.sections.deliveries = { label: "Deliveries", render: function (root, snap) {
    var u = A.ui.deliveries = A.ui.deliveries || { zone: "", status: "", partner: "", date: "" };
    function opts(list, key, sel) { return list.map(function (x) { return '<option value="' + x.id + '"' + (sel === x.id ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join(""); }
    var zoneRows = snap.zones.map(function (z) { return "<tr><td>" + esc(z.name) + '</td><td><label class="sr-only" for="zf-' + z.id + '">Fee for ' + esc(z.name) + '</label><input id="zf-' + z.id + '" type="number" min="0" step="50" data-zone="' + z.id + '" value="' + (z.fee === null ? "" : z.fee) + '" placeholder="To be confirmed"></td><td><button type="button" class="btn btn-outline btn-sm" data-zsave="' + z.id + '">Save</button></td></tr>'; }).join("");
    var partnerRows = snap.partners.map(function (p) { return "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.phone) + "</td><td>" + esc(p.area) + "</td><td>" + HB.badge(p.available ? "Available" : "Unavailable") + "</td></tr>"; }).join("");
    root.innerHTML = '<div class="dash-head"><h1>Deliveries</h1></div><section class="form-card"><div class="filters">' +
      '<div class="field"><label for="df-zone">Area</label><select id="df-zone"><option value="">All</option>' + opts(snap.zones, "id", u.zone) + '</select></div>' +
      '<div class="field"><label for="df-status">Status</label><select id="df-status"><option value="">All</option>' + HB.DELIVERY_STATUSES.map(function (s) { return "<option" + (u.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></div>' +
      '<div class="field"><label for="df-partner">Partner</label><select id="df-partner"><option value="">All</option><option value="none"' + (u.partner === "none" ? " selected" : "") + ">Unassigned</option>" + opts(snap.partners, "id", u.partner) + '</select></div>' +
      '<div class="field"><label for="df-date">Created on</label><input id="df-date" type="date" value="' + esc(u.date) + '"></div></div><div id="del-table"></div>' +
      '<p class="note">Statuses are entered by the team and partners. HomeBasket does not record travel distance, live location or traffic.</p></section>' +
      '<section class="form-card"><h2>Delivery areas and indicative fees</h2>' + A.table(["Area", "Fee (₦), blank = to be confirmed", ""], zoneRows) + "</section>" +
      '<section class="form-card"><h2>Delivery partners</h2>' + A.table(["Partner", "Phone", "Area", "Availability"], partnerRows) + "</section>";
    function draw() {
      var rows = snap.deliveries.filter(function (d) {
        if (u.zone && d.zoneId !== u.zone) return false; if (u.status && d.status !== u.status) return false;
        if (u.partner === "none" ? d.partnerId : (u.partner && d.partnerId !== u.partner)) return false;
        if (u.date && d.createdAt.slice(0, 10) !== u.date) return false; return true;
      }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).map(function (d) {
        var p = byId(snap.partners, d.partnerId), o = byId(snap.orders, d.orderRef, "ref");
        return '<tr><td><a href="#orders/' + d.orderRef + '"><strong>' + d.orderRef + "</strong></a></td><td>" + esc(d.area) + "</td><td>" + (p ? esc(p.name) : '<span class="muted">Unassigned</span>') + "</td><td>" + (d.option === "scheduled" ? "Scheduled " + esc(d.scheduledDate || "") : "Standard") + "</td><td>" + fmt(d.estFee) + "</td><td>" + (d.actualCost !== null ? fmt(d.actualCost) : "-") + "</td><td>" + HB.badge(d.cancelled ? "Cancelled" : d.status) + (o && o.delayed ? " " + HB.badge("Delayed") : "") +
          '</td><td><small>Created ' + HB.formatDateTime(d.createdAt) + "<br>Updated " + HB.formatDateTime(d.updatedAt) + '</small></td><td><button type="button" class="btn btn-outline btn-sm" data-manage="' + d.id + '"' + (d.cancelled ? " disabled" : "") + ">Manage</button></td></tr>";
      }).join("");
      root.querySelector("#del-table").innerHTML = A.table(["Order", "Area", "Partner", "Option", "Estimated fee", "Actual cost", "Status", "Times", ""], rows, "No deliveries match.");
    }
    draw();
    [["df-zone", "zone"], ["df-status", "status"], ["df-partner", "partner"], ["df-date", "date"]].forEach(function (p) { root.querySelector("#" + p[0]).addEventListener("change", function (e) { u[p[1]] = e.target.value; draw(); }); });
    root.addEventListener("click", function (e) {
      var m = e.target.closest("[data-manage]"), z = e.target.closest("[data-zsave]");
      if (m) manageModal(byId(snap.deliveries, m.dataset.manage), snap);
      if (z) A.act(HB.api.saveZone(z.dataset.zsave, root.querySelector('[data-zone="' + z.dataset.zsave + '"]').value), "Fee saved.");
    });
  } };

  /* ================= DELIVERY PARTNER AREA ================= */
  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("delivery-root"); if (!root) return;
    var partnerId = null;
    function draw() {
      HB.api.getSnapshot().then(function (snap) {
        if (!partnerId) partnerId = snap.partners[0].id;
        var p = byId(snap.partners, partnerId);
        var mine = snap.deliveries.filter(function (d) { return d.partnerId === partnerId; }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
        var open = mine.filter(function (d) { return !d.cancelled && ["Delivered", "Returned"].indexOf(d.status) < 0; });
        var done = mine.filter(function (d) { return d.cancelled || ["Delivered", "Returned"].indexOf(d.status) > -1; });
        var cards = open.map(function (d) {
          var o = byId(snap.orders, d.orderRef, "ref"), btn = "";
          if (d.status === "Assigned" && !d.accepted) btn = '<button type="button" class="btn btn-primary" data-do="accept">Accept delivery</button>';
          else if (d.status === "Assigned" || d.status === "Ready for Pickup") btn = '<button type="button" class="btn btn-primary" data-do="Picked Up">Mark picked up</button>';
          else if (d.status === "Picked Up") btn = '<button type="button" class="btn btn-primary" data-do="Out for Delivery">Start delivery (out for delivery)</button>';
          else if (d.status === "Out for Delivery") btn = '<button type="button" class="btn btn-primary" data-do="deliver">Mark delivered</button> <button type="button" class="btn btn-outline" data-do="fail">Report failed delivery</button>';
          else if (d.status === "Failed Delivery") btn = '<button type="button" class="btn btn-outline" data-do="Out for Delivery">Try again (out for delivery)</button>';
          return '<article class="req-card" data-id="' + d.id + '"><h3>' + d.orderRef + " " + HB.badge(d.status) + (d.accepted ? " " + HB.badge("Accepted") : "") + '</h3><dl class="review-list"><div><dt>Pickup point</dt><dd>HomeBasket packing point</dd></div><div><dt>Destination</dt><dd>' + esc(o.customer.address) + ", " + esc(o.customer.area) + "</dd></div><div><dt>Customer contact</dt><dd>" + esc(o.customer.name) + " · " + esc(o.customer.phone) + "</dd></div><div><dt>Handling notes</dt><dd>" + esc(o.customer.instructions || "None") + " · " + o.lines.length + " item line(s)" + (d.option === "scheduled" ? " · scheduled " + esc(d.scheduledDate || "") : "") + "</dd></div></dl>" +
            (o.status === "Cancelled" ? "" : '<div class="btn-row">' + btn + "</div>") + "</article>";
        }).join("");
        root.innerHTML = '<div class="dash-head"><h1>Delivery partner area</h1></div><div class="alert alert-info">Partner login is not yet enabled, so pick a partner account below. Updates are saved in this browser only. There is no live location tracking or photo upload yet.</div>' +
          '<div class="field preview-as"><label for="view-as">Partner account</label><select id="view-as">' + snap.partners.map(function (x) { return '<option value="' + x.id + '"' + (x.id === partnerId ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + "</select></div>" +
          '<section class="form-card"><h2>Profile</h2><dl class="review-list"><div><dt>Name</dt><dd>' + esc(p.name) + "</dd></div><div><dt>Phone</dt><dd>" + esc(p.phone) + "</dd></div><div><dt>Service area</dt><dd>" + esc(p.area) + '</dd></div><div><dt>Availability</dt><dd>' + HB.badge(p.available ? "Available" : "Unavailable") + ' <button type="button" class="btn btn-outline btn-sm" id="toggle-av">' + (p.available ? "Mark unavailable" : "Mark available") + "</button></dd></div></dl></section>" +
          '<section class="form-card"><h2>Assigned deliveries (' + open.length + ")</h2>" + (cards || '<p class="muted">No deliveries assigned. An admin assigns deliveries from the Deliveries section.</p>') + "</section>" +
          '<section class="form-card"><h2>Completed</h2>' + A.table(["Order", "Area", "Outcome"], done.map(function (d) { return "<tr><td>" + d.orderRef + "</td><td>" + esc(d.area) + "</td><td>" + HB.badge(d.cancelled ? "Cancelled" : d.status) + "</td></tr>"; }).join(""), "Nothing completed yet.") + "</section>";
        root.querySelector("#toggle-av").addEventListener("click", function () { HB.run(HB.api.setPartnerAvailability(partnerId, !p.available), "Availability updated.").then(draw, function () {}); });
      });
    }
    root.addEventListener("change", function (e) { if (e.target.id === "view-as") { partnerId = e.target.value; draw(); } });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-do]"); if (!b) return;
      var id = b.closest(".req-card").dataset.id, what = b.dataset.do;
      function go(pr, msg) { HB.run(pr, msg).then(draw, function () {}); }
      if (what === "accept") go(HB.api.updateDeliveryDetails(id, { accepted: true, note: "Delivery accepted by partner" }), "Delivery accepted.");
      else if (what === "deliver") {
        var done = false;
        HB.modal({ title: "Confirm delivery", body: "<p>Confirm that this order has been handed over to the customer?</p>" + '<div class="field"><label for="pod-note">Proof of delivery note (e.g. who received it)</label><input id="pod-note" maxlength="300"></div><p class="note">Photo proof needs a backend and is not available yet.</p>',
          actions: [{ label: "Not yet", cls: "btn-outline" }, { label: "Yes, mark delivered", cls: "btn-primary", onClick: function (c) {
            var pod = c.el.querySelector("#pod-note").value; done = true;
            go(HB.api.updateDeliveryStatus(id, "Delivered", pod ? "Received by: " + pod : "").then(function (r) { return HB.api.updateDeliveryDetails(id, { pod: pod }).then(function () { return r; }); }), "Marked as delivered.");
          } }] });
      } else if (what === "fail") {
        A.promptNote("Report failed delivery", "What happened?", "").then(function (n) { if (n) go(HB.api.updateDeliveryStatus(id, "Failed Delivery", n), "Failed delivery reported."); });
      } else go(HB.api.updateDeliveryStatus(id, what), "Status updated.");
    });
    draw();
  });
})();
