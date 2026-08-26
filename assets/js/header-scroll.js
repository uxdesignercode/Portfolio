(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  var COMPACT_AT = 80;   // px scrolled before the header is allowed to compact
  var DEAD_ZONE = 6;     // ignore sub-pixel/trackpad jitter below this delta

  var lastY = window.scrollY;
  var ticking = false;

  function update() {
    var y = window.scrollY;
    var delta = y - lastY;

    if (Math.abs(delta) > DEAD_ZONE) {
      if (delta > 0 && y > COMPACT_AT) {
        header.classList.add("is-compact");
      } else if (delta < 0 || y <= COMPACT_AT) {
        header.classList.remove("is-compact");
      }
      lastY = y;
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
})();
