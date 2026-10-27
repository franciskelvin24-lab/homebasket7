/* ==========================================================================
   HomeBasket — account pages (Sign in, Create account, Forgot password, My account)
   DEMONSTRATION ONLY: there is no real authentication. Everything goes through
   HB.data.customers (assets/js/data-access.js), which keeps a profile in this
   browser tab, never stores or checks passwords, and sends nothing anywhere.
   ========================================================================== */
(function () {
  "use strict";
  var HB = window.HB, esc = HB.escapeHtml;
  var FIELDS = ["name", "email", "phone", "password", "confirmPassword"];

  function setError(form, field, msg) {
    var out = document.getElementById("err-" + field), el = form.elements[field];
    if (out) out.textContent = msg || "";
    if (el) el.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function clearErrors(form) { FIELDS.forEach(function (f) { setError(form, f, ""); }); var fe = document.getElementById("form-error"); if (fe) fe.textContent = ""; }
  /* Show a repository error on its field when it names one, otherwise at the top of the form */
  function showError(form, err) {
    var code = err && err.code;
    if (code && FIELDS.indexOf(code) > -1 && form.elements[code]) { setError(form, code, err.message); form.elements[code].focus(); return; }
    var fe = document.getElementById("form-error"); if (fe) fe.textContent = HB.errMsg(err); else HB.toast(HB.errMsg(err), "error");
  }
  /* Only ever redirect to another page of this site, never to a URL from the query string */
  function nextPage(fallback) {
    var n = new URLSearchParams(location.search).get("next");
    return n && /^[a-z0-9-]+\.html$/i.test(n) ? n : fallback;
  }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = label; }

  function initLogin(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clearErrors(form);
      var btn = form.querySelector('[type="submit"]'), label = btn.textContent; busy(btn, true, "Signing in…");
      HB.data.customers.signIn({ email: form.elements.email.value, password: form.elements.password.value }).then(function () {
        form.elements.password.value = "";
        location.href = nextPage("my-account.html");
      }, function (err) { busy(btn, false, label); showError(form, err); });
    });
  }
  function initSignup(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clearErrors(form);
      var btn = form.querySelector('[type="submit"]'), label = btn.textContent; busy(btn, true, "Creating account…");
      HB.data.customers.createAccount({ name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value,
        password: form.elements.password.value, confirmPassword: form.elements.confirmPassword.value }).then(function () {
        form.elements.password.value = ""; form.elements.confirmPassword.value = "";   /* never kept */
        location.href = "my-account.html?welcome=1";
      }, function (err) { busy(btn, false, label); showError(form, err); });
    });
  }
  function initForgot(form) {
    var out = document.getElementById("forgot-result");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clearErrors(form); out.hidden = true;
      HB.data.customers.requestPasswordReset(form.elements.email.value).then(function () {
        out.innerHTML = "<strong>No email was sent.</strong> This is a demonstration. On the live site, if an account exists for that address, we will email a link to reset the password. Until real accounts are connected, you can simply create a new demonstration account.";
        out.hidden = false; out.focus();
      }, function (err) { showError(form, err); });
    });
  }

  /* ---------- My account ---------- */
  function profileDialog(me, done) {
    HB.modal({ title: "Edit your details", body: '<div class="field"><label for="pf-name">Full name</label><input id="pf-name" value="' + esc(me.name) + '" autocomplete="name"></div>' +
      '<div class="field"><label for="pf-phone">Phone number <span class="optional">(optional)</span></label><input id="pf-phone" type="tel" value="' + esc(me.phone) + '" autocomplete="tel"></div><p class="field-error" id="pf-err" role="alert"></p>',
      actions: [{ label: "Cancel", cls: "btn-outline" }, { label: "Save", cls: "btn-primary", onClick: function (c) {
        return HB.data.customers.updateProfile({ name: c.el.querySelector("#pf-name").value, phone: c.el.querySelector("#pf-phone").value }).then(function () { done(); }, function (err) { c.el.querySelector("#pf-err").textContent = HB.errMsg(err); return false; });
      } }] });
  }
  function initAccount(root) {
    function draw() {
      var me = HB.session.current();
      if (!me) {
        root.innerHTML = '<div class="alert alert-warn" role="note"><strong>Demonstration accounts.</strong> Sign-in is simulated and is not secure authentication.</div><div class="empty-state"><div class="empty-icon" aria-hidden="true">👤</div><h2>You are not signed in</h2><p>You can shop and track orders as a guest. Sign in to keep your details and saved baskets together.</p><div class="btn-row center"><a class="btn btn-primary" href="login.html?next=my-account.html">Sign in</a><a class="btn btn-outline" href="create-account.html">Create an account</a></div></div>';
        return;
      }
      Promise.all([HB.data.savedBaskets.list(), HB.data.orders.listForCustomer(me.id)]).then(function (r) {
        var baskets = r[0].baskets, orders = r[1];
        var welcome = new URLSearchParams(location.search).get("welcome") ? '<div class="alert alert-success" role="status"><strong>Welcome, ' + esc(me.name) + '.</strong> Your demonstration account is ready.</div>' : "";
        var rows = orders.map(function (o) {
          var d = HB.orderUpdates.describe(o);
          return '<li class="order-row"><div><a href="track-order.html?ref=' + encodeURIComponent(o.ref) + '"><strong>' + esc(o.ref) + '</strong></a> ' + (o.sample ? HB.badge("Sample order") : "") + '<br><small class="muted">Ordered ' + HB.formatDateTime(o.createdAt) + "</small></div><div class=\"order-meta\"><span class=\"badge " + (d.cancelled ? "badge-danger" : (d.stepIndex === 7 ? "badge-success" : "badge-warn")) + '">' + esc(d.label) + "</span><br><strong>" + HB.formatNaira(d.total) + "</strong></div></li>";
        }).join("");
        root.innerHTML = '<div class="alert alert-warn" role="note"><strong>Demonstration account.</strong> This is a simulated sign-in kept in this browser tab only. It is not secure authentication, and closing the tab ends it.</div>' + welcome +
          '<section class="form-card"><div class="row-between"><h2>Your details</h2><button type="button" class="btn btn-outline btn-sm" id="edit-profile">Edit</button></div><dl class="review-list"><div><dt>Name</dt><dd>' + esc(me.name) + "</dd></div><div><dt>Email</dt><dd>" + esc(me.email) + "</dd></div><div><dt>Phone</dt><dd>" + esc(me.phone || "Not added") + "</dd></div></dl></section>" +
          '<section class="form-card"><h2>Saved baskets</h2><p>' + (baskets.length ? "You have <strong>" + baskets.length + "</strong> saved " + (baskets.length === 1 ? "basket" : "baskets") + " on this device." : "You have not saved a basket yet.") + '</p><a class="btn btn-outline btn-sm" href="saved-baskets.html">Open saved baskets</a></section>' +
          '<section class="form-card"><h2>Your orders on this device</h2>' + (rows ? '<ul class="order-list">' + rows + "</ul>" : '<p class="muted">No orders yet. Orders you place while signed in appear here.</p><a class="btn btn-primary btn-sm" href="shop.html">Shop Essentials</a>') +
          '<p class="note">Order statuses are updated by our team and are not tracked live. Orders are kept in this browser only.</p></section>' +
          '<section class="form-card"><h2>Account</h2><div class="btn-row"><button type="button" class="btn btn-outline" id="sign-out">Sign out</button><button type="button" class="btn btn-ghost" id="delete-account">Delete this demonstration account</button></div></section>';
        root.querySelector("#edit-profile").addEventListener("click", function () { profileDialog(me, function () { HB.toast("Details updated."); draw(); }); });
        root.querySelector("#sign-out").addEventListener("click", function () { HB.data.customers.signOut().then(function () { location.href = "login.html"; }); });
        root.querySelector("#delete-account").addEventListener("click", function () {
          HB.confirm("Delete this demonstration account and its saved baskets from this browser? Orders you already placed stay on this device.", { title: "Delete account", confirmLabel: "Delete", danger: true }).then(function (ok) {
            if (ok) HB.data.customers.deleteAccount().then(function () { HB.toast("Account deleted."); location.href = "../index.html"; });
          });
        });
      }, function (err) { root.innerHTML = '<div class="alert alert-danger">' + esc(HB.errMsg(err)) + "</div>"; });
    }
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var f;
    if ((f = document.getElementById("login-form"))) initLogin(f);
    if ((f = document.getElementById("signup-form"))) initSignup(f);
    if ((f = document.getElementById("forgot-form"))) initForgot(f);
    if ((f = document.getElementById("account-root"))) initAccount(f);
  });
})();
