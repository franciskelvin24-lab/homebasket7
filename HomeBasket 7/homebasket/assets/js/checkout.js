/* HomeBasket — checkout: validation, order creation, WhatsApp message */
(function () {
  "use strict";
  var HB = window.HB;

  HB.buildOrderMessage = function (o) {
    var items = o.lines.map(function (l, i) { return (i + 1) + ". " + l.name + " (" + l.unit + ") — " + l.qty + " × " + HB.formatNaira(l.unitPrice) + " = " + HB.formatNaira(l.qty * l.unitPrice); }).join("\n");
    return ["HOME BASKET — ORDER REQUEST", "Order reference: " + o.ref, "",
      "Customer: " + o.customer.name, "Phone: " + o.customer.phone, "Delivery area: " + o.customer.area, "Delivery address: " + o.customer.address,
      "Delivery instructions: " + (o.customer.instructions || "None"),
      "Delivery option: " + (o.deliveryOption === "scheduled" ? "Scheduled for " + o.scheduledDate : "Standard"), "",
      "ITEMS", items, "",
      "Estimated subtotal: " + HB.formatNaira(o.subtotalEst),
      "Delivery fee estimate: " + (o.deliveryFeeEst === null ? "To be confirmed" : HB.formatNaira(o.deliveryFeeEst)),
      "Estimated total: " + HB.formatNaira(o.totalEst) + (o.deliveryFeeEst === null ? " (excluding delivery)" : ""),
      "Payment: details to be confirmed by HomeBasket", "",
      "This is an order request, not a confirmed order. HomeBasket must confirm availability and prices before accepting it."].join("\n");
  };

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("checkout-root"); if (!root) return;
    var form = document.getElementById("checkout-form"), done = document.getElementById("order-done");
    var me = HB.session.current();   /* prefill from the signed-in (demonstration) account */
    if (me) { form.elements.name.value = me.name; form.elements.phone.value = me.phone || ""; }
    var zones = [], zoneSel = form.elements.zone, optionRadios = form.querySelectorAll('input[name="option"]'), dateField = document.getElementById("date-field");

    function showEmpty() {
      root.innerHTML = '<div class="empty-state"><div class="empty-icon" aria-hidden="true">🧺</div><h2>Your basket is empty</h2><p>Add a few essentials before checking out.</p><a class="btn btn-primary" href="' + HB.link("shop") + '">Shop Essentials</a></div>';
    }
    if (!HB.Cart.lines().length) { showEmpty(); return; }

    function selectedZone() { return zones.filter(function (z) { return z.id === zoneSel.value; })[0] || null; }
    function drawSummary() {
      var lines = HB.Cart.lines(), sub = HB.Cart.subtotal(), z = selectedZone();
      document.getElementById("summary-items").innerHTML = lines.map(function (l) {
        return "<li><span>" + l.qty + " × " + HB.escapeHtml(l.product.name) + '<small class="muted"> ' + HB.escapeHtml(l.product.unit) + "</small></span><strong>" + HB.formatNaira(l.total) + "</strong></li>";
      }).join("");
      document.getElementById("sum-sub").textContent = HB.formatNaira(sub);
      document.getElementById("sum-fee").textContent = z ? (z.fee === null ? "To be confirmed" : HB.formatNaira(z.fee)) : "Choose an area";
      document.getElementById("sum-total").textContent = HB.formatNaira(sub + ((z && z.fee) || 0)) + (z && z.fee === null ? " + delivery" : "");
    }
    HB.data.zones.list().then(function (z) {
      zones = z;
      zoneSel.innerHTML = '<option value="">Select your area…</option>' + z.map(function (x) { return '<option value="' + x.id + '">' + HB.escapeHtml(x.name) + "</option>"; }).join("");
      drawSummary();
    });
    zoneSel.addEventListener("change", drawSummary);
    var dateInput = form.elements.date; dateInput.min = new Date().toISOString().slice(0, 10);
    optionRadios.forEach(function (r) { r.addEventListener("change", function () { dateField.hidden = form.elements.option.value !== "scheduled"; }); });

    var rules = {
      name: function (v) { return v.length < 2 ? "Enter your full name." : ""; },
      phone: function (v) { return !v ? "Enter a phone number we can reach you on." : (HB.normalizeNgPhone(v) ? "" : "Enter a valid Nigerian number, e.g. 0803 123 4567 or +234 803 123 4567."); },
      zone: function (v) { return v ? "" : "Choose your delivery area."; },
      address: function (v) { return v.length < 8 ? "Enter your full delivery address, with a landmark if possible." : ""; },
      date: function (v) { return form.elements.option.value !== "scheduled" ? "" : (v && v >= dateInput.min ? "" : "Choose a delivery date (today or later)."); }
    };
    function setError(f, msg) { var el = form.elements[f]; document.getElementById("err-" + f).textContent = msg; el.setAttribute("aria-invalid", msg ? "true" : "false"); }
    Object.keys(rules).forEach(function (f) {
      form.elements[f].addEventListener("blur", function () { setError(f, rules[f](form.elements[f].value.trim())); });
      form.elements[f].addEventListener("input", function () { if (form.elements[f].getAttribute("aria-invalid") === "true") setError(f, rules[f](form.elements[f].value.trim())); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      Object.keys(rules).forEach(function (f) { var m = rules[f](form.elements[f].value.trim()); setError(f, m); if (m && !first) first = form.elements[f]; });
      if (first) { first.focus(); return; }
      var btn = document.getElementById("place-order"); btn.disabled = true; btn.textContent = "Placing your order…";
      HB.data.orders.create({
        customer: { name: form.elements.name.value, phone: form.elements.phone.value, address: form.elements.address.value, instructions: form.elements.instructions.value },
        zoneId: form.elements.zone.value, deliveryOption: form.elements.option.value, scheduledDate: form.elements.date.value,
        lines: HB.Cart.items().map(function (i) { return { productId: i.id, qty: i.qty }; })
      }).then(function (order) {
        HB.Cart.clear();
        showDone(order);
      }, function (err) {
        HB.toast(HB.errMsg(err), "error"); btn.disabled = false; btn.textContent = "Place order request";
      });
    });

    function showDone(order) {
      root.hidden = true; done.hidden = false;
      document.getElementById("done-ref").textContent = order.ref;
      document.getElementById("done-summary").innerHTML = "<li>" + order.lines.map(function (l) { return l.qty + " × " + HB.escapeHtml(l.name) + " (" + HB.escapeHtml(l.unit) + ")"; }).join("</li><li>") + "</li>";
      document.getElementById("done-total").textContent = HB.formatNaira(order.totalEst) + (order.deliveryFeeEst === null ? " + delivery (to be confirmed)" : "");
      document.getElementById("track-link").href = HB.link("track-order") + "?ref=" + encodeURIComponent(order.ref);
      document.getElementById("done-wa").addEventListener("click", function () { HB.openWhatsApp(HB.buildOrderMessage(order)); });
      document.getElementById("order-done-heading").focus();
      window.scrollTo(0, 0);
    }
  });
})();
