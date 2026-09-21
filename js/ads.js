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
    //   const sponsor = pickSponsor(config.sponsors, "C", seccion, hoy);
    //   if (sponsor) { ... activar y renderizar ... }
    //   else { ... hidden; el hueco lo cubre AdSense ... }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activarSidebarSiHaySponsor, false);
  } else {
    activarSidebarSiHaySponsor();
  }
})();