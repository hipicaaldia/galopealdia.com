(function () {
  "use strict";

  // Sesión 3 publicidad: aquí se cargará sponsors.json + lógica
  // de cascada. Por ahora, función dummy que NO activa sidebar.
  function activarSidebarSiHaySponsor() {
    var grid = document.querySelector(
      '.layout-grid[data-layout="con-sidebar"]'
    );
    if (!grid) return;

    // TODO Sesión 3:
    //   const config = await fetch("/config/sponsors.json").then(r => r.json());
    //   const consent = window.cmpConsent ? window.cmpConsent() : null;
    //   const sponsor = pickSponsor(config.sponsors, "C", seccion, hoy);
    //   if (sponsor) { ... activar y renderizar ... }
    //   else if (consent && consent.publicidad) { ... AdSense placeholder ... }
    //   else { ... hidden ... }
    var haySponsorActivo = false;

    if (haySponsorActivo) {
      grid.classList.add("tiene-sidebar");
      var aside = grid.querySelector(".slot-sidebar");
      if (aside) {
        aside.removeAttribute("hidden");
        // TODO Sesión 3: aside.innerHTML = renderSponsorBanner(sponsor);
      }
    }
  }

  // Reaccionar a cambios de consentimiento (definido en cmp.js).
  function onConsentChanged() {
    activarSidebarSiHaySponsor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activarSidebarSiHaySponsor, false);
  } else {
    activarSidebarSiHaySponsor();
  }
  document.addEventListener("cmp:consent-changed", onConsentChanged, false);
})();