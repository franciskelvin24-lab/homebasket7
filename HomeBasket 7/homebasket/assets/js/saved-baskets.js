/* ==========================================================================
   HomeBasket — Restock My Basket (saved baskets) : USER INTERFACE ONLY
   --------------------------------------------------------------------------
   All saving, loading and validation lives in HB.data.savedBaskets
   (assets/js/data-access.js). This file never touches browser storage, so the
   repository can later be replaced by a real database without changing it.
   Prices are never saved, so current prices are always shown on restock.
   Adding to the cart goes through HB.Cart.add, which merges duplicates.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var CFG = window.HB_CONFIG, repo = function () { return HB.data.savedBaskets; };
  var MAX = CFG.MAX_QTY || 99, NAME_MAX = 40;
  var esc = function (s) { return HB.escapeHtml(s); };

  /* ---------- availability + totals (always from CURRENT catalogue prices) ---------- */
  function status(productId) {
    var p = HB.getProduct(productId);
    if (!p || !p.active) return { ok: false, label: "No longer available" };
    if (p.stock === "out_of_stock") return { ok: false, label: "Currently out of stock", product: p };
    return { ok: true, product: p };
  }
  function summarise(b) {
    var total = 0, unavailable = 0;
    b.items.forEach(function (i) { var s = status(i.id); if (s.ok) total += s.product.price * i.qty; else unavailable++; });
    return { total: total, unavailable: unavailable };
  }

  /* ---------- name dialog (save / rename). submit(value, overwrite) -> Promise<{ok, exists?, error?}> ---------- */
  function nameDialog(o) {
    return new Promise(function (resolve) {
      var done = false;
      HB.modal({ title: o.title, body: '<div class="field"><label for="bn-name">Basket name</label><input id="bn-name" type="text" maxlength="' + NAME_MAX + '" value="' + esc(o.value || "") + '" placeholder="e.g. Monthly groceries" autocomplete="off"><p class="field-error" id="bn-err" role="alert"></p></div>',
        actions: [{ label: "Cancel", cls: "btn-outline" }, { label: o.button, cls: "btn-primary", onClick: function (c) {
          var input = c.el.querySelector("#bn-name"), err = c.el.querySelector("#bn-err"), v = input.value;
          return o.submit(v, false).then(function (r) {
            if (r.exists) {
              return HB.confirm("Replace the contents of “" + esc(v.trim()) + "” with your current basket?", { title: "Basket already exists", confirmLabel: "Replace" }).then(function (ok) {
                if (!ok) return false;
                return o.submit(v, true).then(function (r2) { if (!r2.ok) { err.textContent = r2.error; return false; } done = true; resolve(r2); });
              });
            }
            if (!r.ok) { err.textContent = r.error; input.setAttribute("aria-invalid", "true"); input.focus(); return false; }
            done = true; resolve(r);
          });
        } }],
        onClose: function () { if (!done) resolve(null); },
        onOpen: function (c) {
          var input = c.el.querySelector("#bn-name"); input.focus(); input.select();
          input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); c.el.querySelector(".modal-foot .btn-primary").click(); } });
        } });
    });
  }
  function saveCartAs(name, overwrite) { return repo().save({ name: name, items: HB.Cart.items(), overwrite: overwrite }); }

  /* ================= CART PAGE: "Save this basket" bar ================= */
  function initCartBar(bar) {
    function draw() {
      repo().list().then(function (res) {
        var n = HB.Cart.count(), count = res.baskets.length;
        bar.innerHTML = '<div class="save-bar"><div>' + (n ? "<strong>Buy this regularly?</strong> Save this basket to restock it later." : "Your basket is empty.") + '</div><div class="btn-row">' +
          (n ? '<button type="button" class="btn btn-outline btn-sm" id="save-basket-btn">Save this basket</button>' : "") +
          '<a class="btn btn-ghost btn-sm" href="saved-baskets.html">Saved baskets' + (count ? " (" + count + ")" : "") + "</a></div></div>";
        var btn = bar.querySelector("#save-basket-btn");
        if (btn) btn.addEventListener("click", function () {
          nameDialog({ title: "Save this basket", button: "Save basket", submit: saveCartAs }).then(function (r) {
            if (r && r.ok) { HB.toast("Basket “" + r.basket.name + "” saved. Find it under Restock."); draw(); }
          });
        });
      });
    }
    draw();
    window.addEventListener("hb:cart-change", draw);
    window.addEventListener("hb:cart-render", draw);
  }

  /* ================= SAVED BASKETS PAGE ================= */
  function initPage(root) {
    var openId = (location.hash || "").slice(1) || null, selected = {}, banner = "";

    function ownerNote() {
      var c = HB.session.current();
      return '<p class="note">' + (c ? "Showing the saved baskets for " + esc(c.name) + " (demonstration account). " : "You are browsing as a guest. ") + "Saved baskets stay on this device and browser.</p>";
    }
    function listView() {
      return repo().list().then(function (res) {
        var list = res.baskets, cartN = HB.Cart.count();
        var warn = res.corrupt ? '<div class="alert alert-warn" role="status">Your saved baskets could not be read, so the list was reset. New baskets will save normally.</div>' : "";
        var head = '<div class="row-between"><h2>Your saved baskets' + (list.length ? " (" + list.length + ")" : "") + "</h2>" + (cartN ? '<button type="button" class="btn btn-primary btn-sm" id="save-current">Save current basket</button>' : "") + "</div>";
        if (!list.length) {
          root.innerHTML = warn + head + '<div class="empty-state"><div class="empty-icon" aria-hidden="true">🧺</div><h2>No saved baskets yet</h2><p>Save your basket from the cart page and restock it in a few taps next time.</p><div class="btn-row center"><a class="btn btn-primary" href="shop.html">Shop Essentials</a><a class="btn btn-outline" href="cart.html">Go to cart</a></div></div>' + ownerNote();
        } else {
          root.innerHTML = warn + head + '<ul class="basket-list">' + list.map(function (b) {
            var s = summarise(b), n = b.items.length;
            return '<li class="basket-card" data-id="' + b.id + '"><div><h3>' + esc(b.name) + '</h3><p class="muted">' + n + (n === 1 ? " item" : " items") + " · saved " + HB.formatDate(b.updatedAt) + "</p><p><strong>" + HB.formatNaira(s.total) + '</strong> <span class="muted">at today\'s prices</span>' +
              (s.unavailable ? '<br><small class="stale">' + s.unavailable + (s.unavailable === 1 ? " item is" : " items are") + " unavailable</small>" : "") + '</p></div><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-act="open">Restock</button><button type="button" class="btn btn-ghost btn-sm" data-act="rename">Rename</button><button type="button" class="btn btn-ghost btn-sm" data-act="delete">Delete</button></div></li>';
          }).join("") + "</ul>" + '<p class="note">Prices shown are today\'s prices. Our team confirms availability and prices before an order is accepted.</p>' + ownerNote();
        }
        var sc = root.querySelector("#save-current");
        if (sc) sc.addEventListener("click", function () {
          nameDialog({ title: "Save current basket", button: "Save basket", submit: saveCartAs }).then(function (r) { if (r && r.ok) { HB.toast("Basket saved."); listView(); } });
        });
      });
    }

    function detailView(id) {
      return repo().get(id).then(function (b) {
        if (!b) { openId = null; history.replaceState(null, "", location.pathname); return listView(); }
        b.items.forEach(function (i) { if (selected[i.id] === undefined) selected[i.id] = status(i.id).ok; });
        var rows = b.items.map(function (i) {
          var s = status(i.id), p = s.product, nm = p ? esc(p.name) : "Unavailable product";
          if (!s.ok) return '<li class="restock-row is-unavailable" data-pid="' + esc(i.id) + '"><div class="cart-thumb">' + (p ? HB.imgTag(p) : '<div class="thumb-empty" aria-hidden="true">🛒</div>') + "</div><div><h3>" + nm + "</h3><p>" + HB.badge("Unavailable") + ' <span class="muted">' + esc(s.label) + '</span></p></div><div class="restock-actions"><button type="button" class="link-btn" data-act="remove-item">' + HB.icons.trash + " Remove</button></div></li>";
          return '<li class="restock-row" data-pid="' + esc(i.id) + '"><label class="restock-check"><input type="checkbox" data-act="toggle"' + (selected[i.id] ? " checked" : "") + ' aria-label="Include ' + nm + '"></label><div class="cart-thumb">' + HB.imgTag(p) + "</div><div><h3>" + nm + '</h3><p class="muted">' + esc(p.unit) + " · " + HB.formatNaira(p.price) + ' today</p><div class="qty" role="group" aria-label="Quantity for ' + nm + '"><button type="button" class="qty-btn" data-act="dec" aria-label="Decrease quantity">−</button><input class="qty-input" type="number" inputmode="numeric" min="1" max="' + MAX + '" value="' + i.qty + '" aria-label="Quantity of ' + nm + '"><button type="button" class="qty-btn" data-act="inc" aria-label="Increase quantity">+</button></div></div><div class="restock-actions"><strong>' + HB.formatNaira(p.price * i.qty) + '</strong><button type="button" class="link-btn" data-act="remove-item">' + HB.icons.trash + " Remove</button></div></li>";
        }).join("");
        var chosen = b.items.filter(function (i) { return selected[i.id] && status(i.id).ok; });
        var sub = chosen.reduce(function (t, i) { return t + status(i.id).product.price * i.qty; }, 0);
        var availAll = b.items.filter(function (i) { return status(i.id).ok; });
        root.innerHTML = '<a href="saved-baskets.html" class="back-link">← All saved baskets</a><div class="row-between"><h2>' + esc(b.name) + '</h2><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="rename">Rename</button><button type="button" class="btn btn-ghost btn-sm" data-act="delete">Delete</button></div></div>' + banner +
          (b.items.length ? '<ul class="restock-list">' + rows + "</ul>" : '<div class="empty-state"><h2>This basket is empty</h2><p>Every item was removed. You can delete it or save a new basket from your cart.</p></div>') +
          '<div class="summary-card restock-summary"><dl class="summary-rows"><div><dt>Selected items</dt><dd>' + chosen.length + '</dd></div><div class="total"><dt>Selected subtotal (today\'s prices)</dt><dd>' + HB.formatNaira(sub) + '</dd></div></dl><div class="btn-row"><button type="button" class="btn btn-primary" data-act="add-selected"' + (chosen.length ? "" : " disabled") + '>Add selected to cart</button><button type="button" class="btn btn-outline" data-act="add-all"' + (availAll.length ? "" : " disabled") + ">Add all available to cart</button></div>" +
          '<p class="note">Adding merges with what is already in your cart. Our team confirms availability and prices before an order is accepted.</p></div>';
        banner = "";
      });
    }
    function draw() { return openId ? detailView(openId) : listView(); }

    root.addEventListener("click", function (e) {
      var card = e.target.closest(".basket-card"), row = e.target.closest(".restock-row"), btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.dataset.act, id = card ? card.dataset.id : openId;
      if (act === "open") { openId = id; selected = {}; history.pushState(null, "", "#" + id); draw().then(function () { window.scrollTo(0, 0); }); }
      else if (act === "rename") {
        repo().get(id).then(function (b) {
          return nameDialog({ title: "Rename basket", button: "Save name", value: b ? b.name : "", submit: function (v) { return repo().rename(id, v); } });
        }).then(function (r) { if (r && r.ok) { HB.toast("Basket renamed."); draw(); } });
      } else if (act === "delete") {
        repo().get(id).then(function (bd) {
          return HB.confirm("Delete “" + esc(bd ? bd.name : "this basket") + "”? This cannot be undone.", { title: "Delete basket", confirmLabel: "Delete", danger: true });
        }).then(function (ok) {
          if (!ok) return;
          return repo().remove(id).then(function () { HB.toast("Basket deleted."); openId = null; history.replaceState(null, "", location.pathname); return draw(); });
        });
      } else if (act === "inc" || act === "dec") {
        var q = (parseInt(row.querySelector(".qty-input").value, 10) || 1) + (act === "inc" ? 1 : -1);
        repo().setQty(openId, row.dataset.pid, Math.max(1, Math.min(MAX, q))).then(draw);
      } else if (act === "remove-item") {
        var pid = row.dataset.pid;
        repo().removeItem(openId, pid).then(function () { delete selected[pid]; HB.toast("Item removed from this basket."); return draw(); });
      } else if (act === "add-selected" || act === "add-all") {
        repo().get(openId).then(function (bk) {
          if (!bk) return;
          var pick = bk.items.filter(function (i) { return status(i.id).ok && (act === "add-all" || selected[i.id]); });
          if (!pick.length) { HB.toast("Select at least one available item.", "error"); return; }
          pick.forEach(function (i) { HB.Cart.add(i.id, i.qty); });   /* merges with existing cart lines */
          var skipped = bk.items.length - pick.length;
          banner = '<div class="alert alert-success" role="status"><strong>' + pick.length + (pick.length === 1 ? " item" : " items") + " added to your basket.</strong> " + (skipped && act === "add-all" ? skipped + " unavailable " + (skipped === 1 ? "item was" : "items were") + " skipped. " : "") + '<a href="cart.html">View basket</a></div>';
          return draw().then(function () { window.scrollTo(0, 0); });
        });
      }
    });
    root.addEventListener("change", function (e) {
      var row = e.target.closest(".restock-row"); if (!row) return;
      if (e.target.dataset.act === "toggle") { selected[row.dataset.pid] = e.target.checked; draw(); }
      else if (e.target.classList.contains("qty-input")) repo().setQty(openId, row.dataset.pid, e.target.value).then(draw);
    });
    function route() { openId = (location.hash || "").slice(1) || null; draw(); }
    window.addEventListener("popstate", route);
    window.addEventListener("hashchange", route);
    window.addEventListener("storage", function (e) { if (e.key === (CFG.SAVED_BASKETS_KEY || "homebasket_saved_baskets_v1")) draw(); });
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.getElementById("save-basket-bar"); if (bar) initCartBar(bar);
    var root = document.getElementById("baskets-root"); if (root) initPage(root);
  });
})();
