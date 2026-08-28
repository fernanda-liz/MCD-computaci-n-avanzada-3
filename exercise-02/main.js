// 01 — CARGA DE DATOS
let DATASET = null;
let seleccionados = [];
const MAX_SELECCION = 4;
const COLORES = ['#d9d2c3', '#92b39c', '#c98a6b', '#7a93c9'];

async function cargarDatos() {
  const respuesta = await fetch('materiales.json');
  DATASET = await respuesta.json();
}

// 02 — NORMALIZACIÓN
// Cada eje tiene su propia escala visual (0 a 1), calculada a partir del
// rango real de valores de ese eje en el dataset. Un dato no es una forma:
// esto es la decisión de diseño que traduce MPa/% a una posición legible.
function calcularRangos() {
  const rangos = {};
  DATASET.ejes.forEach(eje => {
    const valores = DATASET.materiales
      .map(m => m.valores[eje.id])
      .filter(v => v !== null && v !== undefined);
    rangos[eje.id] = { min: Math.min(...valores), max: Math.max(...valores) };
  });
  return rangos;
}

function normalizar(valor, rango, invertido) {
  if (valor === null || valor === undefined) return null;
  if (rango.max === rango.min) return 0.5;
  const norm = (valor - rango.min) / (rango.max - rango.min);
  // ejes "invertidos" (ej. % de absorción de humedad): menor valor = mejor
  // resistencia, así que el punto se dibuja más cerca del borde cuando el
  // dato es más bajo, no más alto.
  return invertido ? 1 - norm : norm;
}

// 03 — INTERFAZ: LISTA DE MATERIALES
function renderLista() {
  const contenedor = document.getElementById('lista-materiales');
  contenedor.innerHTML = '';
  DATASET.materiales.forEach(material => {
    const idx = seleccionados.indexOf(material.id);
    const item = document.createElement('div');
    item.className = 'material-item' + (idx >= 0 ? ' active' : '');
    const color = idx >= 0 ? COLORES[idx] : 'transparent';
    item.innerHTML = `
      <span class="swatch" style="background:${color}"></span>
      <span>${material.nombre}</span>
      <span class="fab">${material.fabricante}</span>
    `;
    item.addEventListener('click', () => toggleSeleccion(material.id));
    contenedor.appendChild(item);
  });
}

function toggleSeleccion(id) {
  const idx = seleccionados.indexOf(id);
  if (idx >= 0) {
    seleccionados.splice(idx, 1);
  } else {
    if (seleccionados.length >= MAX_SELECCION) seleccionados.shift();
    seleccionados.push(id);
  }
  renderLista();
  dibujarRadar();
}

// 04 — REGLA DE REPRESENTACIÓN: DIBUJAR EL RADAR
const CX = 300, CY = 300, RADIO = 220;
let capaGrilla = null;
let capaPoligonos = null;
let estadoAnterior = {}; // id -> [radio por eje] normalizados 0..1, para animar desde ahí
let animacionEnCurso = null;
const DURACION_MS = 480;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function dibujarGrillaYEjes() {
  const svg = document.getElementById('radar');
  const ejes = DATASET.ejes;
  const n = ejes.length;

  capaGrilla = crearElemento('g', {});
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const puntos = ejes.map((_, i) => puntoEnEje(i, n, f * RADIO, CX, CY)).join(' ');
    capaGrilla.appendChild(crearElemento('polygon', { points: puntos, class: 'radar-grid' }));
  });
  ejes.forEach((eje, i) => {
    const [x, y] = puntoEnEje(i, n, RADIO, CX, CY);
    capaGrilla.appendChild(crearElemento('line', { x1: CX, y1: CY, x2: x, y2: y, class: 'radar-grid' }));
    const [lx, ly] = puntoEnEje(i, n, RADIO + 26, CX, CY);
    const label = crearElemento('text', {
      x: lx, y: ly, class: 'radar-axis-label',
      'text-anchor': lx > CX + 5 ? 'start' : lx < CX - 5 ? 'end' : 'middle'
    });
    label.textContent = `${eje.label} (${eje.unidad})`;
    capaGrilla.appendChild(label);
  });
  svg.appendChild(capaGrilla);

  capaPoligonos = crearElemento('g', {});
  svg.appendChild(capaPoligonos);
}

// Calcula, para cada material seleccionado, el radio normalizado (0..1) por
// eje. Se separa del dibujo para poder interpolar entre el estado anterior
// y el nuevo, en vez de saltar de golpe a la forma final.
function calcularEstadoObjetivo() {
  const rangos = calcularRangos();
  const objetivo = {};
  seleccionados.forEach(id => {
    const material = DATASET.materiales.find(m => m.id === id);
    objetivo[id] = DATASET.ejes.map(eje => {
      const norm = normalizar(material.valores[eje.id], rangos[eje.id], eje.invertido);
      return norm === null ? 0 : norm;
    });
  });
  return objetivo;
}

function dibujarRadar() {
  if (!capaGrilla) dibujarGrillaYEjes();
  const objetivo = calcularEstadoObjetivo();

  if (animacionEnCurso) cancelAnimationFrame(animacionEnCurso);
  const inicio = performance.now();

  function frame(ahora) {
    const t = Math.min(1, (ahora - inicio) / DURACION_MS);
    const avance = easeOutCubic(t);
    renderPoligonos(objetivo, avance);
    if (t < 1) {
      animacionEnCurso = requestAnimationFrame(frame);
    } else {
      estadoAnterior = objetivo; // queda listo como punto de partida de la próxima animación
      animacionEnCurso = null;
    }
  }
  animacionEnCurso = requestAnimationFrame(frame);
}

function renderPoligonos(objetivo, avance) {
  capaPoligonos.innerHTML = '';
  const ejes = DATASET.ejes;
  const n = ejes.length;

  seleccionados.forEach((id, si) => {
    const material = DATASET.materiales.find(m => m.id === id);
    const color = COLORES[si];
    const desde = estadoAnterior[id] || ejes.map(() => 0);
    const hasta = objetivo[id];
    const puntos = [];

    ejes.forEach((eje, i) => {
      const radioNorm = desde[i] + (hasta[i] - desde[i]) * avance;
      const [x, y] = puntoEnEje(i, n, radioNorm * RADIO, CX, CY);
      puntos.push(`${x},${y}`);

      if (hasta[i] > 0) {
        const valor = material.valores[eje.id];
        const punto = crearElemento('circle', {
          cx: x, cy: y, r: 4, fill: color, class: 'radar-point'
        });
        const titulo = crearElemento('title', {});
        titulo.textContent = `${material.nombre} — ${eje.label}: ${valor} ${eje.unidad}`;
        punto.appendChild(titulo);
        capaPoligonos.appendChild(punto);
      }
    });

    capaPoligonos.appendChild(crearElemento('polygon', {
      points: puntos.join(' '), class: 'radar-poly',
      style: `stroke:${color};fill:${color}`
    }));
  });
}

function puntoEnEje(i, n, radio, cx, cy) {
  const angulo = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [cx + radio * Math.cos(angulo), cy + radio * Math.sin(angulo)];
}

function crearElemento(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// 05 — INICIO
(async function iniciar() {
  await cargarDatos();
  seleccionados = [DATASET.materiales[0].id, DATASET.materiales[3].id];
  renderLista();
  dibujarRadar();
})();
