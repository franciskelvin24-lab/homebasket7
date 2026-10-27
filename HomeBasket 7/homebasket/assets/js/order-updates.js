/* ==========================================================================
   HomeBasket — Reliable Order Updates (customer-facing display mapping)
   --------------------------------------------------------------------------
   Turns the customer-safe order view (HB.api.getOrderByReference with
   { audience: "customer" }) into the eight steps customers see. The internal
   order, supplier-sourcing and delivery statuses in store.js are NOT changed
   and are never shown here.

   Mapping (internal order status + quotation status -> customer step):
     Order Received                              -> Request Received
     Awaiting Availability/Price Confirmation    -> Checking Availability
       ...and the quotation has been sent        -> Awaiting Customer Approval
          (Quotation Ready is the milestone passed on the way there)
     Confirmed                                   -> Order Confirmed
     Sourcing or Packed                          -> Preparing Order
     Out for Delivery                            -> Out for Delivery
     Delivered                                   -> Delivered
     Cancelled                                   -> Cancelled / Unavailable (separate state)

   Status is entered by the HomeBasket team. Nothing here updates by itself,
   polls, or tracks anything live.
   ========================================================================== */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});

  var STEPS = [
    { key: "received", label: "Request Received" },
    { key: "checking", label: "Checking Availability" },
    { key: "quote-ready", label: "Quotation Ready" },
    { key: "awaiting-approval", label: "Awaiting Customer Approval" },
    { key: "confirmed", label: "Order Confirmed" },
    { key: "preparing", label: "Preparing Order" },
    { key: "out", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" }
  ];
  var MESSAGES = {
    received: "We have received your order request. Our team will start checking availability shortly.",
    checking: "We are checking availability and prices. We will send your quotation shortly. Your total is an estimate until then.",
    "checking-expired": "Your earlier quotation has expired. We will prepare an updated one.",
    "awaiting-approval": "Your quotation is ready. Please review the quoted prices below and approve or decline it. Your order is not confirmed until you approve.",
    confirmed: "Your order is confirmed at the approved prices. We are arranging your items.",
    preparing: "We are sourcing and packing your items.",
    out: "Your order is out for delivery. Our team will contact you if anything changes.",
    delivered: "Your order has been delivered. Thank you for choosing HomeBasket.",
    cancelled: "This order has been cancelled. If items were unavailable or you would like to try again, message us on WhatsApp.",
    "cancelled-declined": "You declined the quotation, so this order has been cancelled. Message us on WhatsApp if you would like a new quotation."
  };

  function when(timeline, statuses) {
    for (var i = 0; i < timeline.length; i++) if (statuses.indexOf(timeline[i].status) > -1) return timeline[i].at;
    return null;
  }

  /* view: customer-safe order view. Returns everything the tracking page needs. */
  function describe(view) {
    var q = view.quotation, tl = view.timeline || [], cancelled = view.status === "Cancelled";
    var at = [
      when(tl, ["Order Received"]),
      when(tl, ["Awaiting Availability/Price Confirmation"]),
      when(tl, ["Awaiting your approval"]),
      when(tl, ["Awaiting your approval"]),
      when(tl, ["Confirmed"]),
      when(tl, ["Sourcing", "Packed"]),
      when(tl, ["Out for Delivery"]),
      when(tl, ["Delivered"])
    ];
    var idx;
    if (cancelled) { idx = -1; at.forEach(function (t, i) { if (t) idx = i; }); }
    else if (view.status === "Order Received") idx = 0;
    else if (view.status === "Awaiting Availability/Price Confirmation") idx = (q && q.status === "Awaiting Customer Approval") ? 3 : 1;
    else if (view.status === "Confirmed") idx = 4;
    else if (view.status === "Sourcing" || view.status === "Packed") idx = 5;
    else if (view.status === "Out for Delivery") idx = 6;
    else idx = 7;

    var steps = STEPS.map(function (s, i) {
      var state = "todo";
      if (cancelled) state = i <= idx ? "done" : "todo";
      else if (i < idx) state = "done";
      else if (i === idx) state = idx === 7 ? "done" : "current";
      return { key: s.key, label: s.label, state: state, at: at[i] };
    });

    var key = cancelled ? ((q && q.status === "Rejected") ? "cancelled-declined" : "cancelled")
      : (idx === 1 && q && q.status === "Expired" ? "checking-expired" : STEPS[idx].key);
    var label = cancelled ? "Cancelled / Unavailable" : STEPS[idx].label;

    /* Prices: use the quotation snapshot when it is the agreed or proposed one */
    var priceState = "estimate", lines = view.lines, fee = view.deliveryFeeEst, total = view.totalEst, totalLabel = "Estimated total (not yet confirmed)", snapshot = false;
    if (q && q.status === "Approved") {
      priceState = "approved"; lines = q.lines; fee = q.deliveryFee; total = q.total; totalLabel = "Total payable (approved quotation)"; snapshot = true;
    } else if (q && q.status === "Awaiting Customer Approval") {
      priceState = "quoted"; lines = q.lines; fee = q.deliveryFee; total = q.total; totalLabel = "Quoted total (awaiting your approval)";
    }
    var subtotal = lines.reduce(function (t, l) { return t + l.qty * l.unitPrice; }, 0);
    if (priceState === "estimate") total = subtotal + (fee || 0);

    var changed = [];
    if (snapshot) lines.forEach(function (l) { var p = HB.getProduct(l.productId); if (p && p.price !== l.unitPrice) changed.push(l.name); });
    var last = tl.length ? tl[tl.length - 1].at : view.createdAt;

    return { cancelled: cancelled, stepIndex: idx, steps: steps, label: label, message: MESSAGES[key], lastUpdated: last,
      priceState: priceState, lines: lines, subtotal: subtotal, deliveryFee: fee, total: total, totalLabel: totalLabel, snapshot: snapshot,
      priceNote: changed.length ? "Catalogue prices have changed since your order. Your approved price is unchanged." : "" };
  }

  HB.orderUpdates = { STEPS: STEPS, describe: describe };
})();
