(function () {
  "use strict";

  var COOKIE_NAME = "cookie_consent";
  var SCHEMA_VERSION = 1;
  var COOKIE_TTL_DAYS = 365; // 12 meses, rolling

  // ---------- Cookie helpers ----------
  function readCookie() {
    var name = COOKIE_NAME + "=";
    var parts = (document.cookie || "").split(";");
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].replace(/^\s+/, "");
      if (c.indexOf(name) === 0) {
        try {
          var raw = decodeURIComponent(c.substring(name.length));
          var data = JSON.parse(raw);
          if (data && data.v === SCHEMA_VERSION && data.categorias) {
            return data;
          }
        } catch (e) { /* cookie inválida, ignorar */ }
        return null;
      }
    }
    return null;
  }

  function writeCookie(categorias) {
    var data = {
      v: SCHEMA_VERSION,
      ts: new Date().toISOString(),
      categorias: {
        necesarias: true,
        embebidos: !!categorias.embebidos,
        publicidad: !!categorias.publicidad,
        antispam: !!categorias.antispam
      }
    };
    var maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
    var secure = (location.protocol === "https:") ? "; Secure" : "";
    document.cookie =
      COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(data)) +
      "; Max-Age=" + maxAge +
      "; Path=/" +
      "; SameSite=Lax" +
      secure;
    return data;
  }

  function emitChanged(data) {
    try {
      document.dispatchEvent(new CustomEvent("cmp:consent-changed", {
        detail: { categorias: data.categorias }
      }));
    } catch (e) { /* no-op si CustomEvent no soportado */ }
  }

  // ---------- API global ----------
  window.cmpConsent = function () {
    var data = readCookie();
    return data ? data.categorias : null;
  };

  // ---------- DOM helpers ----------
  function $(sel) { return document.querySelector(sel); }
  function showEl(el) { if (el) el.removeAttribute("hidden"); }
  function hideEl(el) { if (el) el.setAttribute("hidden", ""); }

  function showBanner() { showEl($("#cmp-banner")); }
  function hideBanner() { hideEl($("#cmp-banner")); }

  var _lastFocus = null;
  function showModal() {
    var modal = $("#cmp-modal");
    if (!modal) return;
    _lastFocus = document.activeElement;
    // Precargar checkboxes con valores actuales (si los hay)
    var current = readCookie();
    var cats = current
      ? current.categorias
      : { necesarias: true, embebidos: false, publicidad: false, antispam: false };
    var inputs = modal.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      var name = inputs[i].name;
      if (name === "necesarias") { inputs[i].checked = true; continue; }
      inputs[i].checked = !!cats[name];
    }
    showEl(modal);
    var first = modal.querySelector("button, input:not([disabled])");
    if (first) first.focus();
  }
  function hideModal() {
    var modal = $("#cmp-modal");
    hideEl(modal);
    if (_lastFocus && _lastFocus.focus) {
      try { _lastFocus.focus(); } catch (e) { /* */ }
    }
  }

  // Focus trap dentro del modal (Tab cíclico).
  function trapTab(e) {
    var modal = $("#cmp-modal");
    if (!modal || modal.hasAttribute("hidden")) return;
    if (e.key !== "Tab") return;
    var focusables = modal.querySelectorAll(
      "button, input:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  // ---------- Acciones ----------
  function acceptAll() {
    var data = writeCookie({ embebidos: true, publicidad: true, antispam: true });
    hideBanner(); hideModal();
    emitChanged(data);
  }
  function rejectAll() {
    var data = writeCookie({ embebidos: false, publicidad: false, antispam: false });
    hideBanner(); hideModal();
    emitChanged(data);
  }
  function saveCustom() {
    var modal = $("#cmp-modal");
    if (!modal) return;
    var get = function (name) {
      var el = modal.querySelector('input[name="' + name + '"]');
      return el ? !!el.checked : false;
    };
    var data = writeCookie({
      embebidos: get("embebidos"),
      publicidad: get("publicidad"),
      antispam: get("antispam")
    });
    hideBanner(); hideModal();
    emitChanged(data);
  }

  // ---------- Wire-up ----------
  function onClick(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    // Apertura desde footer / cualquier elemento con data-cmp-open.
    if (t.hasAttribute("data-cmp-open") ||
        (t.closest && t.closest("[data-cmp-open]"))) {
      e.preventDefault();
      showModal();
      return;
    }
    var action = t.getAttribute("data-cmp-action");
    if (!action) return;
    if (action === "accept-all") acceptAll();
    else if (action === "reject-all") rejectAll();
    else if (action === "configure") { hideBanner(); showModal(); }
    else if (action === "save") saveCustom();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      var modal = $("#cmp-modal");
      // Esc cierra el modal pero NO el banner inicial (sería bypass).
      if (modal && !modal.hasAttribute("hidden")) {
        hideModal();
      }
    }
    trapTab(e);
  }

  function init() {
    document.addEventListener("click", onClick, false);
    document.addEventListener("keydown", onKeydown, false);
    // Mostrar banner si no hay decisión válida.
    if (!readCookie()) {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, false);
  } else {
    init();
  }
})();