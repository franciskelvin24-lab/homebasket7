/* ==========================================================================
   HomeBasket — cart (stored via data-access.js) + cart page
   Only product IDs and quantities are stored. No personal data.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var CFG = window.HB_CONFIG, KEY = CFG.CART_KEY, MAX = CFG.MAX_QTY;
  var items = load();

  function load() {
    try {
      var raw = HB.storage.read("local", KEY).value;
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (i) { var p = i && HB.getProduct(i.id); return p && p.active && Number.isInteger(i.qty) && i.qty > 0; })
        .map(function (i) { return { id: i.id, qty: Math.min(i.qty, MAX) }; });
    } catch (e) { return []; }
  }
  function save() {
    HB.storage.write("local", KEY, items);   /* all storage goes through data-access.js */
    window.dispatchEvent(new Event("hb:cart-change"));
  }
  HB.Cart = {
    reload: function () { items = load(); },
    items: function () { return items.slice(); },
    lines: function () {
      return items.map(function (i) { var p = HB.getProduct(i.id); return { product: p, qty: i.qty, total: p.price * i.qty }; })
        .filter(function (l) { return l.product; });
    },
    count: function () { return items.reduce(function (s, i) { return s + i.qty; }, 0); },
    subtotal: function () { return this.lines().reduce(function (s, l) { return s + l.total; }, 0); },
    add: function (id, qty) {
      var p = HB.getProduct(id); if (!p || !p.active || p.stock === "out_of_stock") return;
      qty = Math.max(1, parseInt(qty, 10) || 1);
      var f = items.filter(function (i) { return i.id === id; })[0];
      if (f) f.qty = Math.min(MAX, f.qty + qty); else items.push({ id: id, qty: Math.min(MAX, qty) });
      save();
    },
    setQty: function (id, qty) {
      var f = items.filter(function (i) { return i.id === id; })[0]; if (!f) return;
      qty = parseInt(qty, 10);
      if (!qty || qty < 1) return this.remove(id);
      f.qty = Math.min(MAX, qty); save();
    },
    remove: function (id) { items = items.filter(function (i) { return i.id !== id; }); save(); },
    clear: function () { items = []; save(); }
  };

  /* Lowest delivery-area fee, for the cart-page estimate */
  function minFee(zones) {
    var fees = zones.map(function (z) { return z.fee; }).filter(function (f) { return f !== null; });
    return fees.length ? Math.min.apply(null, fees) : null;
  }

  function renderCart(root, fee) {
    var lines = HB.Cart.lines();
    if (!lines.length) {
      root.innerHTML = '<div class="empty-state"><div class="empty-icon" aria-hidden="true">🧺</div><h2>Your basket is empty</h2><p>Browse the catalogue and add the essentials you need.</p><a class="btn btn-primary" href="' + HB.link("shop") + '">Shop Essentials</a></div>';
      return;
    }
    var rows = lines.map(function (l) {
      var p = l.product, n = HB.escapeHtml(p.name);
      return '<li class="cart-item" data-id="' + p.id + '"><div class="cart-thumb">' + HB.imgTag(p) + "</div><div class=\"cart-info\"><h3>" + n + '</h3><p class="muted">' + HB.escapeHtml(p.unit) + " · " + HB.formatNaira(p.price) + " each</p>" +
        '<div class="cart-controls"><div class="qty" role="group" aria-label="Quantity for ' + n + '"><button type="button" class="qty-btn" data-act="dec" aria-label="Decrease quantity of ' + n + '">−</button>' +
        '<input class="qty-input" type="number" inputmode="numeric" min="1" max="' + MAX + '" value="' + l.qty + '" aria-label="Quantity of ' + n + '"><button type="button" class="qty-btn" data-act="inc" aria-label="Increase quantity of ' + n + '">+</button></div>' +
        '<button type="button" class="link-btn" data-act="remove" aria-label="Remove ' + n + ' from basket">' + HB.icons.trash + " Remove</button></div></div>" +
        '<p class="cart-line-total">' + HB.formatNaira(l.total) + "</p></li>";
    }).join("");
    var sub = HB.Cart.subtotal();
    root.innerHTML = '<div class="cart-layout"><section aria-label="Basket items"><ul class="cart-list">' + rows + '</ul><div class="cart-actions"><a class="btn btn-outline" href="' + HB.link("shop") + '">Continue shopping</a>' +
      '<button type="button" class="btn btn-ghost" data-act="clear">Clear basket</button></div></section>' +
      '<aside class="summary-card" aria-label="Basket summary"><h2>Basket summary</h2><dl class="summary-rows"><div><dt>Items</dt><dd>' + HB.Cart.count() + "</dd></div><div><dt>Subtotal</dt><dd>" + HB.formatNaira(sub) + "</dd></div>" +
      "<div><dt>Delivery fee (estimate)</dt><dd>" + (fee === null ? "At checkout" : "from " + HB.formatNaira(fee)) + "</dd></div>" +
      '<div class="total"><dt>Estimated total</dt><dd>' + HB.formatNaira(sub + (fee || 0)) + "</dd></div></dl>" +
      '<p class="note">Delivery is shown separately and depends on your area (chosen at checkout). Prices and availability are reconfirmed by HomeBasket before your order is accepted. No payment is taken on this site.</p>' +
      '<a class="btn btn-primary btn-block" href="' + HB.link("checkout") + '">Proceed to checkout</a></aside></div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("cart-root"); if (!root) return;
    var fee = null;
    function draw(focusSel) { renderCart(root, fee); if (focusSel) { var el = root.querySelector(focusSel); if (el) el.focus(); } }
    HB.data.zones.list().then(function (z) { fee = minFee(z); draw(); }, function () { draw(); });
    draw();
    window.addEventListener("hb:cart-render", function () { draw(); });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var li = b.closest(".cart-item"), id = li && li.dataset.id, act = b.dataset.act;
      var line = id && HB.Cart.items().filter(function (i) { return i.id === id; })[0];
      if (act === "inc") { HB.Cart.setQty(id, line.qty + 1); draw('[data-id="' + id + '"] [data-act="inc"]'); }
      else if (act === "dec") { HB.Cart.setQty(id, line.qty - 1); draw('[data-id="' + id + '"] [data-act="dec"]'); }
      else if (act === "remove") { HB.Cart.remove(id); draw(".btn"); HB.toast("Item removed"); }
      else if (act === "clear") HB.confirm("Remove all items from your basket?", { title: "Clear basket", confirmLabel: "Clear basket", danger: true }).then(function (ok) { if (ok) { HB.Cart.clear(); draw(".btn"); } });
    });
    root.addEventListener("change", function (e) {
      if (!e.target.classList.contains("qty-input")) return;
      var id = e.target.closest(".cart-item").dataset.id;
      HB.Cart.setQty(id, e.target.value); draw('[data-id="' + id + '"] .qty-input');
    });
  });
})();
