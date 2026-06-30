/**
 * Widget de encuesta de pronósticos (podio) para galopealdia.
 *
 * Uso:
 *   <div id="encuesta-pronostico"></div>
 *   <script src="widget.js"></script>
 *   <script>EncuestaPronostico.montar(document.getElementById('encuesta-pronostico'), CONFIG)</script>
 *
 * CONFIG = {
 *   jornada: "20260524",
 *   apiBase: "https://galopealdia-encuesta....workers.dev",  // "" o "demo" => modo local
 *   carreras: [{ id:"2", nombre:"Premio Abrantes", corredores:[{num:1,caballo:"CUDILLERO"},...] }, ...]
 * }
 *
 * El lector ordena su podio (1º-2º-3º). Tras votar ve el "pronóstico de los
 * lectores" (recuento de Borda: 1º=3, 2º=2, 3º=1). Un voto por carrera/navegador.
 */
(function () {
  function voterId() {
    let id = localStorage.getItem("ep_voter");
    if (!id) { id = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ep_voter", id); }
    return id;
  }
  function esDemo(cfg) { return !cfg.apiBase || cfg.apiBase === "demo"; }
  function getSesion() { try { return JSON.parse(localStorage.getItem("ep_sesion") || "null"); } catch { return null; } }
  function setSesion(s) { localStorage.setItem("ep_sesion", JSON.stringify(s)); }
  const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // --- Borda local (espejo del worker) para modo demo ---
  function agregarLocal(votos) {
    const out = {};
    for (const v of votos) {
      const c = (out[v.carrera] ||= { n: 0, puntos: {} });
      c.n++;
      (v.podio || []).slice(0, 3).forEach((h, i) => { if (h) c.puntos[h] = (c.puntos[h] || 0) + (3 - i); });
    }
    for (const c of Object.values(out))
      c.ranking = Object.entries(c.puntos).map(([caballo, puntos]) => ({ caballo, puntos })).sort((a, b) => b.puntos - a.puntos);
    return out;
  }
  function votosDemo() { try { return JSON.parse(localStorage.getItem("ep_demo") || "[]"); } catch { return []; } }

  async function enviarVoto(cfg, carrera, podio) {
    if (esDemo(cfg)) {
      const vs = votosDemo().filter(v => !(v.carrera === carrera && v.voterId === voterId()));
      vs.push({ carrera, podio, voterId: voterId() });
      localStorage.setItem("ep_demo", JSON.stringify(vs));
      return { carreras: agregarLocal(vs) };
    }
    const ses = getSesion();
    const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jornada: cfg.jornada, carrera, podio, token: ses && ses.token }),
    });
    return r.json();
  }

  // Registro / login contra el Worker (o simulado en modo demo).
  async function autenticar(cfg, accion, datos) {
    if (esDemo(cfg)) { setSesion({ token: "demo-" + voterId(), nombre: datos.nombre || datos.email }); return { ok: true }; }
    const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/" + accion, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
    });
    const j = await r.json();
    if (j && j.ok && j.token) setSesion({ token: j.token, nombre: j.nombre || datos.nombre || datos.email });
    return j;
  }
  async function leerResultados(cfg) {
    if (esDemo(cfg)) return { carreras: agregarLocal(votosDemo()) };
    const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/results?jornada=" + encodeURIComponent(cfg.jornada));
    return r.json();
  }

  // Podio que votó el lector en esta carrera (para resaltar dónde cayó su voto).
  function voterPodio(cfg, carreraId) {
    try { return JSON.parse(localStorage.getItem("ep_podio_" + cfg.jornada + "_" + carreraId) || "null") || []; }
    catch { return []; }
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  }

  // Render del resultado: PODIO (top-3 en tarjetas) + RANKING completo en barras,
  // con el podio votado por el lector resaltado, esté o no en el top-3.
  function pintarResultados(cont, carrera, agg, cfg) {
    const c = (agg.carreras || {})[carrera.id];
    const box = cont.querySelector(".ep-res");
    const n = (c && c.n) ? c.n : 0;
    if (!n) { box.innerHTML = "<em>Aún sin votos. ¡Sé el primero!</em>"; return; }
    // % = cuota de puntos Borda de cada caballo sobre el total.
    const total = (c.ranking || []).reduce((s, r) => s + r.puntos, 0) || 1;
    const pts = {}; (c.ranking || []).forEach(r => { pts[r.caballo] = r.puntos; });
    // TODOS los participantes, incluso con 0% (orden desc por probabilidad).
    const filas = carrera.corredores.map(co => ({
      num: co.num, caballo: co.caballo, pct: ((pts[co.caballo] || 0) / total) * 100,
    })).sort((a, b) => b.pct - a.pct || a.num - b.num);
    const maxPct = filas[0].pct || 1;
    const podio = voterPodio(cfg, carrera.id);
    const miPos = (cab) => podio.indexOf(cab) + 1; // 0 = no estaba en mi voto
    const MED = ["🥇", "🥈", "🥉"];
    const votos = `${n} ${n === 1 ? "voto" : "votos"}`;

    // --- Podio: top-3 en tarjetas (orden visual 2º-1º-3º; 1º elevado) ---
    const top = filas.slice(0, 3);
    const orden = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
    let cards = '<div class="ep-podio">';
    orden.forEach(idx => {
      const f = top[idx]; if (!f) return;
      const mp = miPos(f.caballo);
      cards += `<div class="ep-card ep-c${idx + 1}">`
        + `<div class="ep-m">${MED[idx]}</div>`
        + `<div class="ep-cpos">${idx + 1}º · nº ${escHtml(f.num)}</div>`
        + `<div class="ep-ccab">${escHtml(f.caballo)}</div>`
        + `<div class="ep-cpct">${f.pct.toFixed(0)}%</div>`
        + `<div class="ep-cmini"><i style="width:${Math.max(3, (f.pct / maxPct) * 100)}%"></i></div>`
        + (mp ? `<div class="ep-tuvoto">✓ tu ${mp}º</div>` : "")
        + "</div>";
    });
    cards += "</div>";

    // --- Ranking completo en barras (tu voto resaltado, esté o no en el podio) ---
    let lista = `<div class="ep-rank-tit">🗳️ Ranking de los lectores · ${votos}</div><ul class="ep-rank">`;
    filas.forEach((f, i) => {
      const mp = miPos(f.caballo);
      const med = i < 3 ? `<span class="ep-med">${MED[i]}</span> ` : "";
      const chip = mp ? `<span class="ep-chip${mp === 1 ? " oro" : ""}">tu ${mp}º</span>` : "";
      const cls = (i < 3 ? "ep-top" : "ep-resto") + (mp ? " ep-mivoto" : "");
      const w = f.pct > 0 ? Math.max(3, (f.pct / maxPct) * 100) : 0;
      lista += `<li class="${cls}"><span class="ep-name">${med}${escHtml(f.num)}. ${escHtml(f.caballo)} ${chip}</span>`
        + `<span class="ep-track"><span class="ep-bar" style="width:${w}%"></span></span>`
        + `<span class="ep-pct">${f.pct.toFixed(1)}%</span></li>`;
    });
    box.innerHTML = cards + lista + "</ul>";
  }

  function montarCarrera(cfg, carrera) {
    const wrap = document.createElement("div");
    wrap.className = "ep-carrera";
    const opts = '<option value="">—</option>' + carrera.corredores.map(c => `<option value="${c.caballo}">${c.num}. ${c.caballo}</option>`).join("");
    wrap.innerHTML =
      `<h4>${carrera.nombre}</h4>` +
      `<div class="ep-sels">` +
      ["1º", "2º", "3º"].map((lbl, i) => `<label>${lbl} <select data-pos="${i}">${opts}</select></label>`).join("") +
      `</div><button class="ep-btn">Votar mi podio</button><div class="ep-res"></div>`;
    const btn = wrap.querySelector(".ep-btn");
    const lock = () => { wrap.querySelectorAll("select").forEach(s => s.disabled = true); wrap.querySelector(".ep-sels").style.opacity = .6; };
    const yaVoto = localStorage.getItem("ep_voto_" + cfg.jornada + "_" + carrera.id);
    if (yaVoto) {
      // Ya votó: NO mostramos el % hasta que lo pida explícitamente.
      lock();
      btn.textContent = "Ver pronóstico de los lectores";
      btn.addEventListener("click", async () => { pintarResultados(wrap, carrera, await leerResultados(cfg), cfg); });
    } else {
      // No ha votado: solo el formulario; el % permanece oculto hasta votar.
      btn.addEventListener("click", async () => {
        const sels = [...wrap.querySelectorAll("select")].map(s => s.value).filter(Boolean);
        if (sels.length < 3 || new Set(sels).size < 3) { alert("Elige tres caballos distintos para tu podio."); return; }
        const agg = await enviarVoto(cfg, carrera.id, sels);
        localStorage.setItem("ep_voto_" + cfg.jornada + "_" + carrera.id, "1");
        // Guarda el podio votado para resaltar dónde cayó tu voto en el ranking.
        localStorage.setItem("ep_podio_" + cfg.jornada + "_" + carrera.id, JSON.stringify(sels));
        lock(); btn.textContent = "Ya has votado"; btn.disabled = true;
        pintarResultados(wrap, carrera, agg, cfg); // el % aparece SOLO ahora, tras votar
      });
    }
    return wrap;
  }

  function montarAuth(cfg, onOk) {
    const f = document.createElement("div");
    f.className = "ep-registro";
    const priv = cfg.politicaPrivacidadUrl || "/legal/politica-privacidad";
    let modo = "registro";
    function pintar() {
      f.innerHTML =
        `<div class="ep-tabs"><button class="ep-tab" data-m="registro">Crear cuenta</button>` +
        `<button class="ep-tab" data-m="login">Ya tengo cuenta</button></div>` +
        (modo === "registro"
          ? "<label>Nombre<input type='text' class='ep-f-nombre' autocomplete='given-name'></label>" +
            "<label>Apellidos<input type='text' class='ep-f-apellido' autocomplete='family-name'></label>" +
            "<label>Email<input type='email' class='ep-f-email' autocomplete='email'></label>" +
            "<label>Contraseña<input type='password' class='ep-f-pass' autocomplete='new-password'></label>" +
            `<label class='ep-consent'><input type='checkbox' class='ep-f-cons'> Acepto la <a href='${priv}' target='_blank' rel='noopener'>política de privacidad</a> y el tratamiento de mis datos.</label>` +
            "<button class='ep-btn ep-go'>Crear cuenta y participar</button>"
          : "<label>Email<input type='email' class='ep-f-email' autocomplete='email'></label>" +
            "<label>Contraseña<input type='password' class='ep-f-pass' autocomplete='current-password'></label>" +
            "<button class='ep-btn ep-go'>Entrar</button>") +
        "<div class='ep-err'></div>";
      f.querySelectorAll(".ep-tab").forEach(t => t.addEventListener("click", () => { modo = t.dataset.m; pintar(); }));
      f.querySelector(".ep-go").addEventListener("click", onGo);
    }
    async function onGo() {
      const err = (m) => { f.querySelector(".ep-err").textContent = m; };
      const email = (f.querySelector(".ep-f-email").value || "").trim();
      const password = f.querySelector(".ep-f-pass").value || "";
      if (!EMAIL_RX.test(email)) return err("Email no válido.");
      if (password.length < 6) return err("La contraseña debe tener al menos 6 caracteres.");
      let datos, accion;
      if (modo === "registro") {
        const nombre = (f.querySelector(".ep-f-nombre").value || "").trim();
        const apellido = (f.querySelector(".ep-f-apellido").value || "").trim();
        if (!nombre || !apellido) return err("Indica tu nombre y apellidos.");
        if (!f.querySelector(".ep-f-cons").checked) return err("Debes aceptar la política de privacidad.");
        datos = { nombre, apellido, email, password, consentimiento: true }; accion = "register";
      } else { datos = { email, password }; accion = "login"; }
      f.querySelector(".ep-go").disabled = true;
      try {
        const r = await autenticar(cfg, accion, datos);
        if (r && r.ok) { f.remove(); onOk(); }
        else err((r && r.error) || "No se pudo completar. Inténtalo de nuevo.");
      } catch (e) { err("Error de conexión."); }
      finally { const b = f.querySelector(".ep-go"); if (b) b.disabled = false; }
    }
    pintar();
    return f;
  }

  window.EncuestaPronostico = {
    montar(cont, cfg) {
      cont.innerHTML = "<h3>Encuesta: tu pronóstico</h3><p class='ep-aviso'>Crea tu cuenta, vota tu podio (1º-2º-3º) y verás la probabilidad según los lectores. Análisis para disfrutar, no apuesta.</p>";
      const zona = document.createElement("div");
      cont.appendChild(zona);
      const pintar = () => { cfg.carreras.forEach(c => zona.appendChild(montarCarrera(cfg, c))); };
      if (getSesion()) pintar();
      else cont.insertBefore(montarAuth(cfg, pintar), zona);
    },
  };
})();
