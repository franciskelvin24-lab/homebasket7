/* ==========================================================================
   HomeBasket — supplier notification service (queue only)
   Nothing here sends a message yet. In production this belongs on a backend
   that talks to the WhatsApp Business Platform, an SMS gateway or email
   provider (never from browser JavaScript, never with keys in the page).
   ========================================================================== */
(function () {
  "use strict";
  var HB = window.HB, core = HB._core;

  /* Create (or re-create) the queued notification for a sourcing request. */
  HB.api.createSupplierNotification = core.mut(function (srRef) {
    var sr = core.byId(core.state().sourcing, srRef, "ref");
    if (!sr) core.fail("Sourcing request not found.");
    return core.notify(sr);
  });
  HB.api.retrySupplierNotification = HB.api.createSupplierNotification;

  /* Log entries, newest first. Optional filter { srRef }. Admin-only data. */
  HB.api.getNotificationLog = core.rd(function (filter) {
    return core.state().notifications
      .filter(function (n) { return !filter || !filter.srRef || n.srRef === filter.srRef; })
      .map(function (n) { var c = JSON.parse(JSON.stringify(n)); c.supplierName = core.supplierName(n.supplierId); return c; });
  });

  /* HTML table for the admin notification log (buttons carry data-* hooks). */
  HB.notificationLogHtml = function (log) {
    if (!log.length) return '<p class="muted">No notifications yet. They appear when a sourcing request is created.</p>';
    var rows = log.map(function (n) {
      var out = n.direction === "outbound";
      var actions = '<button type="button" class="btn btn-ghost btn-sm" data-act="view-msg" data-id="' + n.id + '">View</button>';
      if (out && n.status !== "Queued") actions += ' <button type="button" class="btn btn-outline btn-sm" data-act="retry" data-sr="' + n.srRef + '">Retry</button>';
      if (out && n.status === "Failed") actions += ' <button type="button" class="btn btn-ghost btn-sm" data-act="manual" data-sr="' + n.srRef + '">Contact manually</button>';
      return "<tr><td>" + HB.formatDateTime(n.at) + "</td><td>" + HB.escapeHtml(n.supplierName) + '<br><small class="muted">' + (out ? "Outgoing" : "Supplier reply") + " · " + HB.escapeHtml(n.channel) + "</small></td>" +
        "<td>" + n.srRef + "</td><td>" + HB.badge(n.status) + '<br><small class="muted">' + HB.escapeHtml(n.note) + "</small></td><td>" + actions + "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Recipient</th><th>Request</th><th>Outcome</th><th>Actions</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  };
})();
