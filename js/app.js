// Galope al Día — runtime mínimo.
(() => {
  const y = document.querySelector("footer p");
  if (y) { /* fecha ya renderizada server-side */ }
})();

// Botón "Configuración de cookies" del pie. El consentimiento lo gestiona el
// mensaje de Google (CMP certificada, TCF v2.2) que sirve `adsbygoogle.js`;
// aquí solo se reabre.
//
// El botón nace con `hidden` y solo se muestra si `googlefc` responde: si el
// script de Google está bloqueado por un adblocker, o el visitante está fuera
// del EEE y Google no pinta mensaje, un botón visible que no hace nada es peor
// que ningún botón.
(() => {
  const btn = document.querySelector("[data-cmp-revocar]");
  if (!btn || typeof window.googlefc === "undefined") { return; }
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({
    CONSENT_DATA_READY: () => {
      btn.hidden = false;
      btn.addEventListener("click", () => {
        try { window.googlefc.showRevocationMessage(); } catch (e) { /* no-op */ }
      }, false);
    },
  });
})();