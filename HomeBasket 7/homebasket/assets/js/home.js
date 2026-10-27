/* HomeBasket — home page: categories + popular products */
(function () {
  "use strict";
  var HB = window.HB;
  document.addEventListener("DOMContentLoaded", function () {
    var cats = document.getElementById("category-grid");
    if (cats) cats.innerHTML = window.HB_CATEGORIES.map(function (c) {
      return '<a class="category-card" href="' + HB.link("shop") + "?category=" + c.id + '" style="--tile:' + c.color + '"><span class="category-emoji" aria-hidden="true">' + c.emoji + "</span><h3>" + HB.escapeHtml(c.name) + "</h3><p>" + HB.escapeHtml(c.blurb) + "</p></a>";
    }).join("");
    var pop = document.getElementById("popular-grid");
    if (pop) {
      pop.innerHTML = window.HB_FEATURED_IDS.map(HB.getProduct).filter(function (p) { return p && p.active; }).map(HB.productCard).join("");
      HB.bindProductCards(pop);
    }
    var warn = document.getElementById("wa-warning");
    if (warn) warn.hidden = HB.whatsappConfigured();
  });
})();
