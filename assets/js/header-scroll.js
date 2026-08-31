(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  var COMPACT_AT = 100;      // Scroll down past this → compact
  var EXPAND_AT = 40;        // Scroll up to this → expand (hysteresis prevents flicker)
  var isCompact = false;
  var ticking = false;
  var lastY = 0;

  function update(y) {
    var shouldBeCompact;

    if (isCompact) {
      // Already compact: stay compact until scrolling back up past EXPAND_AT
      shouldBeCompact = y > EXPAND_AT;
    } else {
      // Not compact: only become compact after scrolling past COMPACT_AT
      shouldBeCompact = y > COMPACT_AT;
    }

    if (shouldBeCompact !== isCompact) {
      isCompact = shouldBeCompact;
      if (isCompact) {
        header.classList.add("is-compact");
      } else {
        header.classList.remove("is-compact");
      }
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        var y = window.scrollY;
        if (Math.abs(y - lastY) > 5) {
          lastY = y;
          requestAnimationFrame(function() { update(y); });
          ticking = true;
        }
      }
    },
    { passive: true }
  );

  update(window.scrollY);
})();
