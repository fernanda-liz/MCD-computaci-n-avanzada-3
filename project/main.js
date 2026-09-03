const COLOR = {
  propio: "#92b39c",
  literatura: "#c98a6b",
  fallida: "#c9695f",
  linea: "#263156",
  texto: "#a7aec4",
  dorado: "#d9b25a"
};

const ESTADO_LABEL = { completa: "completa", pendiente: "pendiente", incompleta: "incompleta", fallida: "fallida" };
const DRAFT_KEY = "bitacora-lapislazuli-borrador-ficha";

let PROBETAS = [];
let filtroOrigen = "todos";
let filtroEstado = "todos";
let filtroRuta = "todos";
let ordenActual = "filler";
let rutaExplorador = "FDM";

async function cargarDatos() {
  const respuesta = await fetch("probetas.json");
  const datos = await respuesta.json();
  PROBETAS = datos.probetas;
  calcularMaxMetricas();
  renderGaleria();
  dibujarPlano();
  dibujarRanking();
  actualizarExplorador();
}

function probetasVisibles() {
  const lista = PROBETAS.filter(p =>
    (filtroOrigen === "todos" || p.origen === filtroOrigen) &&
    (filtroEstado === "todos" || p.estado === filtroEstado) &&
    (filtroRuta === "todos" || p.ruta === filtroRuta)
  );
  return lista.sort((a, b) => {
    if (ordenActual === "flexural") {
      const fa = a.banco_pruebas.flexural_mpa;
      const fb = b.banco_pruebas.flexural_mpa;
      if (fa === null && fb === null) return a.materia_prima.filler_wt - b.materia_prima.filler_wt;
      if (fa === null) return 1;
      if (fb === null) return -1;
      return fb - fa;
    }
    return a.materia_prima.filler_wt - b.materia_prima.filler_wt;
  });
}

function fila(etiqueta, valor, unidad) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `<div class="dato"><span>${etiqueta}</span><span>${valor}${unidad ? " " + unidad : ""}</span></div>`;
}

let MAX_METRICAS = {};

function calcularMaxMetricas() {
  const campos = ["tensil_mpa", "flexural_mpa", "modulo_flexural_gpa", "modulo_almacenamiento_gpa", "compresion_mpa"];
  MAX_METRICAS = {};
  campos.forEach(c => {
    const valores = PROBETAS.map(p => p.banco_pruebas[c]).filter(v => v !== null);
    MAX_METRICAS[c] = valores.length ? Math.max(...valores) : 0;
  });
}

function filaBarra(etiqueta, valor, unidad, campo) {
  if (valor === null || valor === undefined) return "";
  const max = MAX_METRICAS[campo] || valor;
  const pct = max > 0 ? Math.max((valor / max) * 100, 4) : 4;
  return `
    <div class="stat-fila">
      <span class="stat-etiqueta">${etiqueta}</span>
      <div class="stat-barra"><div class="stat-relleno" style="width:${pct}%"></div></div>
      <span class="stat-valor">${valor} ${unidad}</span>
    </div>`;
}

function bloqueEnsayo(bp) {
  const filas = [
    filaBarra("Tracción", bp.tensil_mpa, "MPa", "tensil_mpa"),
    filaBarra("Flexión", bp.flexural_mpa, "MPa", "flexural_mpa"),
    filaBarra("Módulo flexural", bp.modulo_flexural_gpa, "GPa", "modulo_flexural_gpa"),
    filaBarra("Módulo almacenamiento", bp.modulo_almacenamiento_gpa, "GPa", "modulo_almacenamiento_gpa"),
    filaBarra("Compresión", bp.compresion_mpa, "MPa", "compresion_mpa")
  ].join("");
  if (filas === "") return `<p class="sin-dato">Sin ensayo mecánico todavía</p>`;
  return `<div class="stat-bloque">${filas}</div><p class="stat-nota">barra = valor relativo al máximo observado en todo el dataset para esa propiedad</p>`;
}

function bloqueCheckpoint(etapaKey, incidencias) {
  const propias = (incidencias || []).filter(inc => inc.etapa === etapaKey);
  if (propias.length === 0) {
    return `<p class="checkpoint checkpoint-ok">✓ checkpoint superado</p>`;
  }
  const filas = propias.map(inc => `<li><strong>${inc.tipo}</strong> — ${inc.detalle}</li>`).join("");
  return `<p class="checkpoint checkpoint-fallo">⚠ checkpoint no superado</p><ul class="checkpoint-lista">${filas}</ul>`;
}

function bloqueFotos(fotos) {
  if (!fotos || fotos.length === 0) return "";
  const imgs = fotos.map(f => `<img src="${f}" alt="" loading="lazy">`).join("");
  return `<div class="foto-tarjeta">${imgs}</div>`;
}

function renderGaleria() {
  const lista = probetasVisibles();
  const contenedor = document.getElementById("galeria");
  contenedor.innerHTML = lista.map(p => {
    const mp = p.materia_prima;
    const fp = p.fabricacion_pieza;
    const bp = p.banco_pruebas;
    return `
      <article class="tarjeta estado-${p.estado}">
        <div class="tarjeta-top">
          <h3>${p.nombre}</h3>
          <div class="badges">
            <span class="badge ${p.origen}">${p.origen === "propio" ? "propia" : "literatura"}</span>
            <span class="badge">${p.ruta}</span>
            <span class="badge estado-badge estado-${p.estado}">${ESTADO_LABEL[p.estado] || p.estado}</span>
          </div>
        </div>
        ${bloqueFotos(p.fotos)}
        <div class="etapa">
          <p class="etapa-nombre">MATERIA PRIMA <span class="etapa-io">input → output: suspensión/filamento listo</span></p>
          ${fila("Matriz", mp.matriz)}
          ${fila("Filler", mp.filler)}
          ${fila("Carga", mp.filler_wt, "wt%")}
          ${fila("Densidad filler", mp.densidad_filler_g_cm3, "g/cm³")}
          ${fila("Granulometría", mp.granulometria_um, "µm")}
          ${fila("Tiempo de reposo", mp.tiempo_reposo_min, "min")}
          ${fila("Proceso", mp.metodo_mezcla)}
          ${fila("Temperatura", mp.temp_proceso_c, "°C")}
          ${bloqueCheckpoint("materia_prima", p.incidencias)}
        </div>
        <div class="etapa">
          <p class="etapa-nombre">FABRICACIÓN DE LA PIEZA <span class="etapa-io">input → output: pieza física</span></p>
          ${fila("Proceso", fp.proceso)}
          ${fila("Temp. impresión", fp.temp_impresion_c, "°C")}
          ${fila("Norma probeta", fp.norma_probeta)}
          ${(fp.parametros_adicionales || []).map(pr => fila(pr.nombre, pr.valor)).join("")}
          ${fp.resultado_visual ? `<p class="observacion">${fp.resultado_visual}</p>` : ""}
          ${fp.gcode ? `<p class="observacion">gcode: <code>${fp.gcode}</code></p>` : ""}
          ${bloqueCheckpoint("fabricacion_pieza", p.incidencias)}
        </div>
        <div class="etapa">
          <p class="etapa-nombre">BANCO DE PRUEBAS <span class="etapa-io">input → output: valores mecánicos</span></p>
          ${bloqueEnsayo(bp)}
          ${bp.observacion ? `<p class="observacion">${bp.observacion}</p>` : ""}
          ${bp.derivacion ? `<p class="observacion"><strong>Derivado:</strong> ${bp.derivacion}</p>` : ""}
          ${bloqueCheckpoint("banco_pruebas", p.incidencias)}
        </div>
        <p class="ref">${p.referencia}</p>
      </article>`;
  }).join("");

  const conEnsayo = lista.filter(p => p.estado === "completa").length;
  const fallidas = lista.filter(p => p.estado === "fallida" || p.estado === "incompleta").length;
  document.getElementById("conteo").textContent =
    `${lista.length} probetas · ${conEnsayo} completas · ${fallidas} fallidas/incompletas`;
}

function dibujarPlano() {
  const svg = document.getElementById("plano");
  const W = 720, H = 460, M = { t: 30, r: 30, b: 60, l: 60 };
  const areaW = W - M.l - M.r;
  const areaH = H - M.t - M.b;
  const bandaY = M.t + areaH + 22;

  const conDato = PROBETAS.filter(p => p.banco_pruebas.flexural_mpa !== null);
  const sinDato = PROBETAS.filter(p => p.banco_pruebas.flexural_mpa === null);

  const maxX = Math.max(...PROBETAS.map(p => p.materia_prima.filler_wt)) + 3;
  const valores = conDato.map(p => p.banco_pruebas.flexural_mpa);
  const minY = Math.floor(Math.min(...valores) - 8);
  const maxY = Math.ceil(Math.max(...valores) + 8);

  const px = v => M.l + (v / maxX) * areaW;
  const py = v => M.t + areaH - ((v - minY) / (maxY - minY)) * areaH;

  let s = "";

  for (let i = 0; i <= 4; i++) {
    const v = minY + (i / 4) * (maxY - minY);
    const y = py(v);
    s += `<line x1="${M.l}" y1="${y}" x2="${M.l + areaW}" y2="${y}" stroke="${COLOR.linea}" stroke-width="1"/>`;
    s += `<text x="${M.l - 10}" y="${y + 4}" text-anchor="end" fill="${COLOR.texto}" font-size="11">${v.toFixed(0)}</text>`;
  }

  for (let v = 0; v <= maxX; v += 5) {
    const x = px(v);
    s += `<line x1="${x}" y1="${M.t}" x2="${x}" y2="${M.t + areaH}" stroke="${COLOR.linea}" stroke-width="1"/>`;
    s += `<text x="${x}" y="${M.t + areaH + 18}" text-anchor="middle" fill="${COLOR.texto}" font-size="11">${v}</text>`;
  }

  s += `<line x1="${M.l}" y1="${bandaY - 8}" x2="${M.l + areaW}" y2="${bandaY - 8}" stroke="${COLOR.linea}" stroke-width="1" stroke-dasharray="3 3"/>`;
  s += `<text x="${M.l + 4}" y="${bandaY - 14}" text-anchor="start" fill="${COLOR.texto}" font-size="10">sin ensayo mecánico</text>`;

  s += `<text x="${M.l + areaW / 2}" y="${H - 8}" text-anchor="middle" fill="${COLOR.texto}" font-size="12">carga de filler (wt%)</text>`;
  s += `<text x="16" y="${M.t + areaH / 2}" text-anchor="middle" fill="${COLOR.texto}" font-size="12" transform="rotate(-90 16 ${M.t + areaH / 2})">resistencia flexural (MPa)</text>`;

  conDato.forEach(p => {
    const x = px(p.materia_prima.filler_wt);
    const y = py(p.banco_pruebas.flexural_mpa);
    s += `<circle cx="${x}" cy="${y}" r="6" fill="${COLOR.literatura}"><title>${p.nombre} — ${p.banco_pruebas.flexural_mpa} MPa</title></circle>`;
    s += `<text x="${x}" y="${y - 12}" text-anchor="middle" fill="${COLOR.texto}" font-size="10">${p.id}</text>`;
  });

  const ocupados = {};
  sinDato.forEach(p => {
    const carga = p.materia_prima.filler_wt;
    const repetidas = sinDato.filter(o => o.materia_prima.filler_wt === carga).length;
    ocupados[carga] = (ocupados[carga] || 0) + 1;
    const desplazamiento = repetidas > 1 ? (ocupados[carga] - (repetidas + 1) / 2) * 16 : 0;
    const x = px(carga) + desplazamiento;
    const esFalla = p.estado === "fallida" || p.estado === "incompleta";

    if (esFalla) {
      const r = 6;
      s += `<g stroke="${COLOR.fallida}" stroke-width="1.5">`;
      s += `<line x1="${x - r}" y1="${bandaY - r}" x2="${x + r}" y2="${bandaY + r}"/>`;
      s += `<line x1="${x - r}" y1="${bandaY + r}" x2="${x + r}" y2="${bandaY - r}"/>`;
      s += `<title>${p.nombre} — ${p.estado}${p.incidencias && p.incidencias[0] ? ": " + p.incidencias[0].tipo : ""}</title>`;
      s += `</g>`;
    } else {
      const color = p.origen === "propio" ? COLOR.propio : COLOR.literatura;
      s += `<circle cx="${x}" cy="${bandaY}" r="6" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 2"><title>${p.nombre} — sin ensayo</title></circle>`;
    }
    s += `<text x="${x}" y="${bandaY + 20}" text-anchor="middle" fill="${COLOR.texto}" font-size="10">${p.id}</text>`;
  });

  svg.innerHTML = s;
}

function dibujarRanking() {
  const svg = document.getElementById("ranking");
  const rankeables = PROBETAS
    .filter(p => p.estado === "completa" && p.banco_pruebas.flexural_mpa !== null)
    .sort((a, b) => b.banco_pruebas.flexural_mpa - a.banco_pruebas.flexural_mpa);

  const M = { t: 20, l: 190, r: 70 };
  const altoFila = 40;
  const W = 720;
  const H = M.t + rankeables.length * altoFila + 20;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const areaW = W - M.l - M.r;
  const maxVal = Math.max(...rankeables.map(p => p.banco_pruebas.flexural_mpa)) * 1.1;

  let s = "";
  rankeables.forEach((p, i) => {
    const y = M.t + i * altoFila;
    const anchoBarra = (p.banco_pruebas.flexural_mpa / maxVal) * areaW;
    const color = p.origen === "propio" ? COLOR.propio : COLOR.literatura;

    s += `<text x="${M.l - 12}" y="${y + altoFila / 2 + 4}" text-anchor="end" fill="${COLOR.texto}" font-size="12">${p.nombre}</text>`;
    s += `<rect x="${M.l}" y="${y + 6}" width="${areaW}" height="${altoFila - 16}" fill="${COLOR.linea}" rx="3"/>`;
    s += `<rect x="${M.l}" y="${y + 6}" width="${anchoBarra}" height="${altoFila - 16}" fill="${color}" rx="3"><title>${p.nombre} — ${p.banco_pruebas.flexural_mpa} MPa</title></rect>`;
    s += `<text x="${M.l + anchoBarra + 10}" y="${y + altoFila / 2 + 4}" fill="${COLOR.dorado}" font-size="13" font-weight="500">${p.banco_pruebas.flexural_mpa} MPa</text>`;
  });

  svg.innerHTML = s;

  const pendientes = PROBETAS.filter(p => p.estado !== "completa" || p.banco_pruebas.flexural_mpa === null);
  const cont = document.getElementById("ranking-pendientes");
  cont.innerHTML = `
    <p class="etapa-nombre" style="margin-top:1.5rem">PENDIENTES DE ENSAYO — ${pendientes.length} probetas, sin valor todavía</p>
    <div class="ranking-lista">
      ${pendientes.map(p => `
        <div class="ranking-fila-pendiente">
          <span class="ranking-nombre">${p.nombre}</span>
          <span class="badge">${p.ruta}</span>
          <span class="badge estado-badge estado-${p.estado}">${ESTADO_LABEL[p.estado] || p.estado}</span>
          <span class="ranking-filler">${p.materia_prima.filler_wt} wt%</span>
        </div>
      `).join("")}
    </div>
  `;
}

function estimar(cargaObjetivo, k, ruta) {
  const ensayadas = PROBETAS
    .filter(p => p.estado === "completa" && p.banco_pruebas.flexural_mpa !== null && p.ruta === ruta)
    .map(p => ({
      id: p.id,
      nombre: p.nombre,
      carga: p.materia_prima.filler_wt,
      valor: p.banco_pruebas.flexural_mpa,
      distancia: Math.abs(p.materia_prima.filler_wt - cargaObjetivo)
    }))
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, k);

  const fallasCercanas = PROBETAS.filter(p =>
    p.ruta === ruta &&
    (p.estado === "fallida" || p.estado === "incompleta") &&
    Math.abs(p.materia_prima.filler_wt - cargaObjetivo) <= 3
  );

  if (ensayadas.length === 0) {
    return { sinDatos: true, vecinos: [], fueraDeRango: false, fallasCercanas };
  }

  let sumaPesos = 0;
  let sumaPonderada = 0;
  ensayadas.forEach(v => {
    const peso = v.distancia === 0 ? 1e6 : 1 / (v.distancia * v.distancia);
    sumaPesos += peso;
    sumaPonderada += peso * v.valor;
    v.peso = peso;
  });

  ensayadas.forEach(v => { v.contribucion = (v.peso / sumaPesos) * 100; });

  const cargas = ensayadas.map(v => v.carga);
  const todasCompletas = PROBETAS.filter(p => p.estado === "completa" && p.banco_pruebas.flexural_mpa !== null && p.ruta === ruta)
    .map(p => p.materia_prima.filler_wt);

  return {
    sinDatos: false,
    valor: sumaPonderada / sumaPesos,
    vecinos: ensayadas,
    fueraDeRango: cargaObjetivo > Math.max(...todasCompletas) || cargaObjetivo < Math.min(...todasCompletas),
    fallasCercanas
  };
}

function actualizarExplorador() {
  if (PROBETAS.length === 0) return;
  const carga = parseFloat(document.getElementById("slider-filler").value);
  const k = parseInt(document.getElementById("slider-k").value, 10);
  document.getElementById("val-filler").textContent = carga;
  document.getElementById("val-k").textContent = k;

  const r = estimar(carga, k, rutaExplorador);

  if (r.sinDatos) {
    document.getElementById("estimacion").textContent = "—";
    document.getElementById("aviso-rango").textContent =
      `La ruta ${rutaExplorador} todavía no tiene ensayos mecánicos completos. ` +
      (rutaExplorador === "SLA" ? "Hoy se evalúa por curado y traslucidez, no por resistencia." : "");
    document.getElementById("aviso-fallas").textContent = r.fallasCercanas.length > 0
      ? `${r.fallasCercanas.length} prueba(s) cerca de esta carga ya fallaron (${r.fallasCercanas.map(p => p.id).join(", ")}).`
      : "";
    document.getElementById("derivacion").innerHTML = "";
    return;
  }

  document.getElementById("estimacion").textContent = r.valor.toFixed(1);

  document.getElementById("aviso-rango").textContent = r.fueraDeRango
    ? "Fuera del rango medido: la estimación extrapola y no debe tomarse como predicción."
    : "";

  document.getElementById("aviso-fallas").textContent = r.fallasCercanas.length > 0
    ? `Atención: ${r.fallasCercanas.length} prueba(s) cerca de esta carga ya fallaron (${r.fallasCercanas.map(p => p.id).join(", ")}).`
    : "";

  document.getElementById("derivacion").innerHTML =
    `<p style="margin:0 0 .5rem">Ponderación de las probetas usadas:</p>` +
    r.vecinos.map(v =>
      `<div class="fila"><span>${v.nombre} · ${v.valor} MPa</span><span>${v.contribucion.toFixed(0)} %</span></div>`
    ).join("");
}

document.querySelectorAll(".vista-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".vista-btn").forEach(b => {
      b.classList.remove("activa");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("activa");
    btn.setAttribute("aria-selected", "true");
    document.querySelectorAll(".vista").forEach(v => v.classList.add("oculta"));
    document.getElementById("vista-" + btn.dataset.vista).classList.remove("oculta");
  });
});

document.querySelectorAll("[data-filtro-origen]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filtro-origen]").forEach(c => c.classList.remove("activa"));
    chip.classList.add("activa");
    filtroOrigen = chip.dataset.filtroOrigen;
    renderGaleria();
  });
});

document.querySelectorAll("[data-filtro-estado]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filtro-estado]").forEach(c => c.classList.remove("activa"));
    chip.classList.add("activa");
    filtroEstado = chip.dataset.filtroEstado;
    renderGaleria();
  });
});

document.querySelectorAll("[data-filtro-ruta]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filtro-ruta]").forEach(c => c.classList.remove("activa"));
    chip.classList.add("activa");
    filtroRuta = chip.dataset.filtroRuta;
    renderGaleria();
  });
});

document.querySelectorAll("[data-explorador-ruta]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-explorador-ruta]").forEach(c => c.classList.remove("activa"));
    chip.classList.add("activa");
    rutaExplorador = chip.dataset.exploradorRuta;
    actualizarExplorador();
  });
});

document.querySelectorAll("[data-orden]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-orden]").forEach(c => c.classList.remove("activa"));
    chip.classList.add("activa");
    ordenActual = chip.dataset.orden;
    renderGaleria();
  });
});

document.getElementById("slider-filler").addEventListener("input", actualizarExplorador);
document.getElementById("slider-k").addEventListener("input", actualizarExplorador);

// ---------- Formulario "Nueva ficha" ----------

let contadorIncidencias = 0;

function filaIncidencia(valores) {
  const idx = contadorIncidencias++;
  const v = valores || { etapa: "materia_prima", tipo: "", detalle: "" };
  const div = document.createElement("div");
  div.className = "fila-incidencia";
  div.dataset.idx = idx;
  div.innerHTML = `
    <select class="inc-etapa">
      <option value="materia_prima" ${v.etapa === "materia_prima" ? "selected" : ""}>materia prima</option>
      <option value="fabricacion_pieza" ${v.etapa === "fabricacion_pieza" ? "selected" : ""}>fabricación pieza</option>
      <option value="banco_pruebas" ${v.etapa === "banco_pruebas" ? "selected" : ""}>banco de pruebas</option>
    </select>
    <input type="text" class="inc-tipo" placeholder="tipo (ej. atasco, grumos)" value="${v.tipo || ""}">
    <input type="text" class="inc-detalle" placeholder="detalle" value="${v.detalle || ""}">
    <button type="button" class="btn-quitar" aria-label="quitar incidencia">×</button>
  `;
  div.querySelector(".btn-quitar").addEventListener("click", () => {
    div.remove();
    guardarBorrador();
  });
  div.querySelectorAll("select, input").forEach(el => el.addEventListener("input", guardarBorrador));
  return div;
}

document.getElementById("btn-agregar-incidencia").addEventListener("click", () => {
  document.getElementById("lista-incidencias").appendChild(filaIncidencia());
  guardarBorrador();
});

function leerIncidencias() {
  return [...document.querySelectorAll("#lista-incidencias .fila-incidencia")].map(div => ({
    etapa: div.querySelector(".inc-etapa").value,
    tipo: div.querySelector(".inc-tipo").value.trim(),
    detalle: div.querySelector(".inc-detalle").value.trim()
  })).filter(inc => inc.tipo || inc.detalle);
}

function filaFoto(rutaSugerida) {
  const div = document.createElement("div");
  div.className = "fila-incidencia fila-foto";
  div.innerHTML = `
    <input type="text" class="foto-ruta" placeholder="fotos/ID/archivo.jpg" value="${rutaSugerida || ""}" style="grid-column: span 3;">
    <button type="button" class="btn-quitar" aria-label="quitar foto">×</button>
  `;
  div.querySelector(".btn-quitar").addEventListener("click", () => {
    div.remove();
    guardarBorrador();
  });
  div.querySelector(".foto-ruta").addEventListener("input", guardarBorrador);
  return div;
}

function leerFotos() {
  return [...document.querySelectorAll(".foto-ruta")].map(i => i.value.trim()).filter(Boolean);
}

function filaParametro(valores) {
  const v = valores || { nombre: "", valor: "" };
  const div = document.createElement("div");
  div.className = "fila-incidencia fila-parametro";
  div.innerHTML = `
    <input type="text" class="param-nombre" placeholder="nombre (ej. altura de capa)" value="${v.nombre || ""}" style="grid-column: span 2;">
    <input type="text" class="param-valor" placeholder="valor (ej. 0.2 mm)" value="${v.valor || ""}">
    <button type="button" class="btn-quitar" aria-label="quitar parámetro">×</button>
  `;
  div.querySelector(".btn-quitar").addEventListener("click", () => {
    div.remove();
    guardarBorrador();
  });
  div.querySelectorAll("input").forEach(el => el.addEventListener("input", guardarBorrador));
  return div;
}

document.getElementById("btn-agregar-parametro").addEventListener("click", () => {
  document.getElementById("lista-parametros").appendChild(filaParametro());
  guardarBorrador();
});

function leerParametros() {
  return [...document.querySelectorAll(".fila-parametro")].map(div => ({
    nombre: div.querySelector(".param-nombre").value.trim(),
    valor: div.querySelector(".param-valor").value.trim()
  })).filter(p => p.nombre || p.valor);
}

let gcodeRuta = null;

document.getElementById("f-gcode-input").addEventListener("change", (ev) => {
  const id = textOrNull("f-id") || "ID";
  const file = ev.target.files[0];
  if (!file) { gcodeRuta = null; document.getElementById("gcode-nombre").textContent = ""; return; }
  gcodeRuta = `gcode/${id}/${file.name}`;
  document.getElementById("gcode-nombre").textContent = `Se sugiere guardar como: ${gcodeRuta}`;
  guardarBorrador();
});

document.getElementById("f-foto-input").addEventListener("change", (ev) => {
  const id = textOrNull("f-id") || "ID";
  const preview = document.getElementById("preview-fotos");
  const lista = document.getElementById("lista-fotos");
  [...ev.target.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = file.name;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
    lista.appendChild(filaFoto(`fotos/${id}/${file.name}`));
  });
  guardarBorrador();
});

function numOrNull(id) {
  const v = document.getElementById(id).value;
  return v === "" ? null : parseFloat(v);
}

function textOrNull(id) {
  const v = document.getElementById(id).value.trim();
  return v === "" ? null : v;
}

function construirFicha() {
  return {
    id: textOrNull("f-id"),
    nombre: textOrNull("f-nombre"),
    origen: document.getElementById("f-origen").value,
    ruta: document.getElementById("f-ruta").value,
    estado: document.getElementById("f-estado").value,
    fecha: textOrNull("f-fecha"),
    referencia: textOrNull("f-referencia"),
    materia_prima: {
      matriz: textOrNull("f-matriz"),
      filler: textOrNull("f-filler"),
      filler_wt: numOrNull("f-filler-wt"),
      densidad_filler_g_cm3: numOrNull("f-densidad"),
      granulometria_um: numOrNull("f-granulometria"),
      metodo_mezcla: textOrNull("f-metodo-mezcla"),
      temp_proceso_c: numOrNull("f-temp-proceso"),
      diametro_filamento_mm: numOrNull("f-diametro"),
      consistencia_filamento: textOrNull("f-consistencia"),
      tiempo_reposo_min: numOrNull("f-reposo")
    },
    fabricacion_pieza: {
      proceso: textOrNull("f-proceso"),
      temp_impresion_c: numOrNull("f-temp-impresion"),
      velocidad_mm_s: numOrNull("f-velocidad"),
      posicion: textOrNull("f-posicion"),
      norma_probeta: textOrNull("f-norma-probeta"),
      resultado_visual: textOrNull("f-resultado-visual"),
      parametros_adicionales: leerParametros(),
      gcode: gcodeRuta
    },
    banco_pruebas: {
      tensil_mpa: numOrNull("f-tensil"),
      flexural_mpa: numOrNull("f-flexural"),
      modulo_flexural_gpa: numOrNull("f-modulo-flexural"),
      modulo_almacenamiento_gpa: numOrNull("f-modulo-alm"),
      compresion_mpa: numOrNull("f-compresion"),
      norma: textOrNull("f-norma"),
      observacion: textOrNull("f-observacion")
    },
    incidencias: leerIncidencias(),
    fotos: leerFotos()
  };
}

function guardarBorrador() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(construirFicha()));
  } catch (e) { /* almacenamiento no disponible: se ignora, no bloquea el formulario */ }
}

function cargarBorrador() {
  let borrador = null;
  try {
    const crudo = localStorage.getItem(DRAFT_KEY);
    if (crudo) borrador = JSON.parse(crudo);
  } catch (e) { borrador = null; }
  if (!borrador) return;

  const set = (id, v) => { if (v !== null && v !== undefined) document.getElementById(id).value = v; };
  set("f-id", borrador.id);
  set("f-nombre", borrador.nombre);
  if (borrador.origen) document.getElementById("f-origen").value = borrador.origen;
  if (borrador.ruta) document.getElementById("f-ruta").value = borrador.ruta;
  if (borrador.estado) document.getElementById("f-estado").value = borrador.estado;
  set("f-fecha", borrador.fecha);
  set("f-referencia", borrador.referencia);

  const mp = borrador.materia_prima || {};
  set("f-matriz", mp.matriz); set("f-filler", mp.filler); set("f-filler-wt", mp.filler_wt);
  set("f-densidad", mp.densidad_filler_g_cm3); set("f-granulometria", mp.granulometria_um);
  set("f-metodo-mezcla", mp.metodo_mezcla); set("f-temp-proceso", mp.temp_proceso_c);
  set("f-diametro", mp.diametro_filamento_mm); set("f-consistencia", mp.consistencia_filamento);
  set("f-reposo", mp.tiempo_reposo_min);

  const fp = borrador.fabricacion_pieza || {};
  set("f-proceso", fp.proceso); set("f-temp-impresion", fp.temp_impresion_c);
  set("f-velocidad", fp.velocidad_mm_s); set("f-posicion", fp.posicion); set("f-norma-probeta", fp.norma_probeta);
  set("f-resultado-visual", fp.resultado_visual);
  if (fp.gcode) { gcodeRuta = fp.gcode; document.getElementById("gcode-nombre").textContent = `Se sugiere guardar como: ${gcodeRuta}`; }

  const listaParams = document.getElementById("lista-parametros");
  (fp.parametros_adicionales || []).forEach(p => listaParams.appendChild(filaParametro(p)));

  const bp = borrador.banco_pruebas || {};
  set("f-tensil", bp.tensil_mpa); set("f-flexural", bp.flexural_mpa);
  set("f-modulo-flexural", bp.modulo_flexural_gpa); set("f-modulo-alm", bp.modulo_almacenamiento_gpa);
  set("f-compresion", bp.compresion_mpa); set("f-norma", bp.norma); set("f-observacion", bp.observacion);

  const lista = document.getElementById("lista-incidencias");
  (borrador.incidencias || []).forEach(inc => lista.appendChild(filaIncidencia(inc)));

  const listaFotos = document.getElementById("lista-fotos");
  (borrador.fotos || []).forEach(ruta => listaFotos.appendChild(filaFoto(ruta)));
}

document.getElementById("form-ficha").addEventListener("input", guardarBorrador);

document.getElementById("form-ficha").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const errorEl = document.getElementById("form-error");
  const ficha = construirFicha();

  if (!ficha.id || !ficha.nombre || ficha.materia_prima.filler_wt === null) {
    errorEl.textContent = "Completa al menos ID, nombre y carga de filler (wt%) antes de generar la ficha.";
    return;
  }
  errorEl.textContent = "";

  const json = JSON.stringify(ficha, null, 2);
  document.getElementById("salida-codigo").textContent = json;
  document.getElementById("btn-copiar").disabled = false;
});

document.getElementById("btn-limpiar").addEventListener("click", () => {
  document.getElementById("form-ficha").reset();
  document.getElementById("lista-incidencias").innerHTML = "";
  document.getElementById("lista-fotos").innerHTML = "";
  document.getElementById("preview-fotos").innerHTML = "";
  document.getElementById("f-foto-input").value = "";
  document.getElementById("lista-parametros").innerHTML = "";
  document.getElementById("f-gcode-input").value = "";
  document.getElementById("gcode-nombre").textContent = "";
  gcodeRuta = null;
  document.getElementById("salida-codigo").textContent = 'Completa el formulario y presiona "Generar ficha JSON".';
  document.getElementById("btn-copiar").disabled = true;
  document.getElementById("form-error").textContent = "";
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignorar */ }
});

document.getElementById("btn-copiar").addEventListener("click", async () => {
  const texto = document.getElementById("salida-codigo").textContent;
  const btn = document.getElementById("btn-copiar");
  try {
    await navigator.clipboard.writeText(texto);
    const original = btn.textContent;
    btn.textContent = "Copiado";
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (e) {
    btn.textContent = "No se pudo copiar";
  }
});

cargarBorrador();
cargarDatos();
